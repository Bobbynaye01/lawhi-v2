/**
 * Generates data/*.json from the documented sources in sources/.
 *
 *   node scripts/build.ts          → (re)write data/
 *   node scripts/build.ts --check  → regenerate in memory and fail if data/ differs
 *
 * Every check below is a hard failure: if a source is incomplete or the two
 * Hafs sources disagree on a single letter, nothing is written.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcesDir = join(root, 'sources');
const dataDir = join(root, 'data');

const TOTAL_HAFS_VERSES = 6236;
const TOTAL_PAGES = 604;

// [surah, verse, text, page, juz, hizb, rub, sajda(0|1)]
type HafsVerse = [number, number, string, number, number, number, number, 0 | 1];
// [surah, verse, text, page, juz, hizb, rub, hafsVerseNumbers]
type WarshVerse = [number, number, string, number, number, number, number, number[]];

interface AlQuranAyah {
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  hizbQuarter: number;
  sajda: boolean | object;
}
interface AlQuranSurah {
  number: number;
  ayahs: AlQuranAyah[];
}
interface QuranComChapter {
  id: number;
  revelation_place: 'makkah' | 'madinah';
  bismillah_pre: boolean;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  translated_name: { name: string };
}
interface WarshAyah {
  number: number;
  surah: string | number;
  page_number: number;
  text: string;
  juz: number;
  hizb: number;
  number_in_hafs?: number[];
}
interface WarshSource {
  id: number;
  rawi?: { name?: string };
  surahs: { id: number; ayahs: WarshAyah[] }[];
}

class DataError extends Error {}

function fail(message: string): never {
  throw new DataError(message);
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(sourcesDir, file), 'utf8').replace(/^\uFEFF/, '')) as T;
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Letters only: drops harakat, Quranic annotation signs, hamza carriers and alef forms. */
export function rasm(text: string): string {
  return text.replace(
    /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF\u0621\u0654\u0655\u0671\u0627\u0649\s]/g,
    '',
  );
}

const BASMALA_RASM = rasm('بسم الله الرحمن الرحيم');

function sectionNumberFor(surah: number, verse: number, starts: [number, number][]): number {
  for (let i = starts.length - 1; i >= 0; i--) {
    const [s, v] = starts[i]!;
    if (s < surah || (s === surah && v <= verse)) return i + 1;
  }
  return fail(`Position ${surah}:${verse} is before the first division`);
}

function buildSurahs(warshCounts: Map<number, number>) {
  const ar = readJson<{ chapters: QuranComChapter[] }>('qurancom-chapters-ar.json').chapters;
  const fr = readJson<{ chapters: QuranComChapter[] }>('qurancom-chapters-fr.json').chapters;
  const en = readJson<{ chapters: QuranComChapter[] }>('qurancom-chapters-en.json').chapters;
  if (ar.length !== 114 || fr.length !== 114 || en.length !== 114) fail('Chapters must be 114');

  return ar.map((c, i) => {
    if (c.id !== i + 1) fail(`Unexpected chapter order at ${i + 1}`);
    return {
      id: c.id,
      nameAr: c.name_arabic,
      nameTranslit: c.name_simple,
      nameFr: fr[i]!.translated_name.name,
      nameEn: en[i]!.translated_name.name,
      revelationPlace: c.revelation_place,
      bismillahPre: c.bismillah_pre,
      versesHafs: c.verses_count,
      versesWarsh: warshCounts.get(c.id) ?? fail(`Missing Warsh count for surah ${c.id}`),
    };
  });
}

/** Verses where Tanzil's hizbQuarter metadata is known to be wrong (Quran.com + Madani mushaf agree). */
const KNOWN_TANZIL_RUB_ERRORS = new Set(['15:49']);

function loadRubStarts(): [number, number][] {
  const list = readJson<{
    rub_el_hizbs: { rub_el_hizb_number: number; verse_mapping: Record<string, string> }[];
  }>('qurancom-rub-boundaries.json').rub_el_hizbs;
  if (list.length !== 240) fail('Quran.com must list 240 rub al-hizb');
  return list.map((rub, i) => {
    if (rub.rub_el_hizb_number !== i + 1) fail(`Unexpected rub order at ${i + 1}`);
    const firstSurah = Math.min(...Object.keys(rub.verse_mapping).map(Number));
    const firstVerse = Number(rub.verse_mapping[String(firstSurah)]!.split('-')[0]);
    return [firstSurah, firstVerse];
  });
}

function buildHafs(expectedCounts: Map<number, number>) {
  const surahs = readJson<{ data: { surahs: AlQuranSurah[] } }>('alquran-cloud-uthmani.json').data
    .surahs;
  const control = new Map(
    readJson<{ verses: { verse_key: string; text_uthmani: string }[] }>(
      'qurancom-uthmani.json',
    ).verses.map((v) => [v.verse_key, v.text_uthmani]),
  );
  const divisions = readJson<{
    juzStarts: [number, number][];
    hizbStarts: [number, number][];
    rubStarts: [number, number][];
  }>('flutter-divisions.json');

  const rubStarts = loadRubStarts();
  rubStarts.forEach(([s, v], i) => {
    const [fs, fv] = divisions.rubStarts[i] ?? fail(`Flutter lacks rub ${i + 1}`);
    if (s !== fs || v !== fv) fail(`Rub ${i + 1} start differs between Quran.com and Flutter`);
  });

  if (surahs.length !== 114) fail('Hafs source must contain 114 surahs');
  if (control.size !== TOTAL_HAFS_VERSES) fail('Control source must contain 6236 verses');

  const verses: HafsVerse[] = [];
  for (const surah of surahs) {
    if (surah.ayahs.length !== expectedCounts.get(surah.number)) {
      fail(`Verse count mismatch for surah ${surah.number}`);
    }
    for (const ayah of surah.ayahs) {
      const key = `${surah.number}:${ayah.numberInSurah}`;
      let text = ayah.text.replace(/^\uFEFF/, '').trim();

      if (ayah.numberInSurah === 1 && surah.number !== 1 && surah.number !== 9) {
        const words = text.split(' ');
        if (rasm(words.slice(0, 4).join(' ')) !== BASMALA_RASM) fail(`Expected basmala at ${key}`);
        text = words.slice(4).join(' ');
      }

      const reference = control.get(key) ?? fail(`Control source lacks ${key}`);
      if (rasm(text) !== rasm(reference)) fail(`Hafs sources disagree at ${key}`);

      // Rub' from Quran.com (identical to Flutter); hizb is derived from it.
      // Flutter's own hizbStarts table is wrong from hizb 12 onward and is not used.
      const rub = sectionNumberFor(surah.number, ayah.numberInSurah, rubStarts);
      const hizb = Math.ceil(rub / 4);
      const juz = ayah.juz;
      if (ayah.hizbQuarter !== rub && !KNOWN_TANZIL_RUB_ERRORS.has(key)) {
        fail(`Rub mismatch between Tanzil and Quran.com at ${key}`);
      }
      if (juz !== sectionNumberFor(surah.number, ayah.numberInSurah, divisions.juzStarts)) {
        fail(`Juz mismatch with Flutter divisions at ${key}`);
      }
      if (juz !== Math.ceil(hizb / 2)) fail(`Juz/hizb inconsistency at ${key}`);
      if (ayah.page < 1 || ayah.page > TOTAL_PAGES) fail(`Invalid page at ${key}`);

      verses.push([
        surah.number,
        ayah.numberInSurah,
        text,
        ayah.page,
        juz,
        hizb,
        rub,
        ayah.sajda ? 1 : 0,
      ]);
    }
  }
  if (verses.length !== TOTAL_HAFS_VERSES) fail(`Expected 6236 Hafs verses, got ${verses.length}`);

  return {
    riwaya: 'hafs',
    source:
      'Tanzil Uthmani (via api.alquran.cloud), cross-checked letter by letter with api.quran.com; rub al-hizb from api.quran.com',
    license: 'Tanzil Quran Text — verbatim copy permitted with attribution (tanzil.net)',
    verseCount: verses.length,
    pageCount: TOTAL_PAGES,
    columns: ['surah', 'verse', 'text', 'page', 'juz', 'hizb', 'rub', 'sajda'],
    verses,
  };
}

function buildWarsh(hafs: { verses: HafsVerse[] }) {
  const source = readJson<WarshSource>('warsh-quranpedia-mushaf4.json');
  if (source.id !== 4 || source.rawi?.name !== 'ورش') fail('Not Quranpedia Warsh mushaf 4');
  if (source.surahs.length !== 114) fail('Warsh source must contain 114 surahs');

  const hafsRasm = new Map(hafs.verses.map((v) => [`${v[0]}:${v[1]}`, rasm(v[2])]));
  const verses: WarshVerse[] = [];
  const counts = new Map<number, number>();
  let lastJuz = 1;
  let lastRub = 1;
  let maxPage = 0;
  let identicalToHafs = 0;

  for (const surah of source.surahs) {
    if (surah.id < 1 || surah.id > 114 || surah.ayahs.length === 0) {
      fail(`Invalid Warsh surah ${surah.id}`);
    }
    let previous = 0;
    for (const ayah of surah.ayahs) {
      const key = `${surah.id}:${ayah.number}`;
      const text = ayah.text.trim();
      if (Number(ayah.surah) !== surah.id || ayah.number !== previous + 1) {
        fail(`Invalid Warsh numbering at ${key}`);
      }
      if (!text || ayah.page_number < 1 || ayah.juz < 0 || ayah.hizb < 0) {
        fail(`Incomplete Warsh metadata at ${key}`);
      }
      // The source leaves juz/hizb at 0 on a few verses: carry the previous value forward.
      const juz = ayah.juz === 0 ? lastJuz : ayah.juz;
      const rub = ayah.hizb === 0 ? lastRub : ayah.hizb;
      lastJuz = juz;
      lastRub = rub;
      previous = ayah.number;
      maxPage = Math.max(maxPage, ayah.page_number);
      if (hafsRasm.get(key) === rasm(text)) identicalToHafs++;

      verses.push([
        surah.id,
        ayah.number,
        text,
        ayah.page_number,
        juz,
        Math.ceil(rub / 4),
        rub,
        ayah.number_in_hafs ?? [],
      ]);
    }
    counts.set(surah.id, previous);
  }

  if (verses.length < 6000 || maxPage < 600) {
    fail(`Warsh source unexpectedly small: ${verses.length} verses, ${maxPage} pages`);
  }
  if (identicalToHafs === verses.length) fail('Warsh source is identical to Hafs');

  return {
    data: {
      riwaya: 'warsh',
      source: 'Quranpedia mushaf 4 — KFGQPC Warsh ʿan Nāfiʿ',
      license: 'King Fahd Glorious Quran Printing Complex — free use, unmodified text, attribution',
      verseCount: verses.length,
      pageCount: maxPage,
      columns: ['surah', 'verse', 'text', 'page', 'juz', 'hizb', 'rub', 'hafsVerses'],
      verses,
    },
    counts,
  };
}

function generate(): Record<string, string> {
  const preliminaryCounts = new Map(
    readJson<{ chapters: QuranComChapter[] }>('qurancom-chapters-ar.json').chapters.map((c) => [
      c.id,
      c.verses_count,
    ]),
  );
  const hafs = buildHafs(preliminaryCounts);
  const warsh = buildWarsh(hafs);
  const surahs = buildSurahs(warsh.counts);

  const files: Record<string, string> = {
    'surahs.json': JSON.stringify(surahs),
    'hafs.json': JSON.stringify(hafs),
    'warsh.json': JSON.stringify(warsh.data),
  };
  files['manifest.json'] = JSON.stringify(
    {
      hafs: { verses: hafs.verseCount, pages: hafs.pageCount, sha256: sha256(files['hafs.json']!) },
      warsh: {
        verses: warsh.data.verseCount,
        pages: warsh.data.pageCount,
        sha256: sha256(files['warsh.json']!),
      },
      surahs: { count: surahs.length, sha256: sha256(files['surahs.json']!) },
    },
    null,
    2,
  );
  return files;
}

function main() {
  const check = process.argv.includes('--check');
  const files = generate();

  if (check) {
    const stale = Object.entries(files).filter(([name, content]) => {
      try {
        return readFileSync(join(dataDir, name), 'utf8') !== content;
      } catch {
        return true;
      }
    });
    if (stale.length > 0) {
      console.error(`data/ is out of date: ${stale.map(([n]) => n).join(', ')}`);
      process.exit(1);
    }
    console.warn('quran-data: all sources verified, data/ is up to date');
    return;
  }

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dataDir, name), content);
  }
  console.warn(`quran-data: wrote ${Object.keys(files).join(', ')}`);
  console.warn(readFileSync(join(dataDir, 'manifest.json'), 'utf8'));
}

try {
  main();
} catch (error) {
  if (error instanceof DataError) {
    console.error(`quran-data verification failed: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
