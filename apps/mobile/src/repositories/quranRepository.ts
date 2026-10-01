import {
  normalizeArabicForSearch,
  type DivisionKind,
  type Riwaya,
  type SurahMeta,
  type Verse,
} from '@lawhi/shared';

type Row = [number, number, string, number, number, number, number, unknown];

interface RiwayaIndex {
  bismillah: string;
  verses: Verse[];
  bySurah: Map<number, Verse[]>;
  byDivision: Record<DivisionKind | 'page', Map<number, Verse[]>>;
  searchText: string[] | null;
}

const cache: Partial<Record<Riwaya, RiwayaIndex>> = {};
let surahCache: SurahMeta[] | null = null;

/**
 * The verified Quran text ships inside the app (packages/quran-data) so the
 * Quran works offline from the first launch. Each riwaya (~1.5 MB) is only
 * parsed the first time it is used.
 */
function loadData(riwaya: Riwaya): { bismillah: string; verses: Row[] } {
  const data =
    riwaya === 'hafs'
      ? (require('@lawhi/quran-data/hafs.json') as { bismillah: string; verses: Row[] })
      : (require('@lawhi/quran-data/warsh.json') as { bismillah: string; verses: Row[] });
  return data;
}

function push(map: Map<number, Verse[]>, key: number, verse: Verse) {
  const list = map.get(key);
  if (list) list.push(verse);
  else map.set(key, [verse]);
}

function index(riwaya: Riwaya): RiwayaIndex {
  const existing = cache[riwaya];
  if (existing) return existing;

  const data = loadData(riwaya);
  const built: RiwayaIndex = {
    bismillah: data.bismillah,
    verses: [],
    bySurah: new Map(),
    byDivision: { juz: new Map(), hizb: new Map(), rub: new Map(), page: new Map() },
    searchText: null,
  };
  for (const [surah, verse, text, page, juz, hizb, rub] of data.verses) {
    const v: Verse = { surah, verse, text, page, juz, hizb, rub };
    built.verses.push(v);
    push(built.bySurah, surah, v);
    push(built.byDivision.juz, juz, v);
    push(built.byDivision.hizb, hizb, v);
    push(built.byDivision.rub, rub, v);
    push(built.byDivision.page, page, v);
  }
  cache[riwaya] = built;
  return built;
}

export const quranRepository = {
  surahs(): SurahMeta[] {
    surahCache ??= require('@lawhi/quran-data/surahs.json') as SurahMeta[];
    return surahCache;
  },

  surah(id: number): SurahMeta | undefined {
    return this.surahs()[id - 1];
  },

  versesOfSurah(riwaya: Riwaya, surah: number): Verse[] {
    return index(riwaya).bySurah.get(surah) ?? [];
  },

  division(riwaya: Riwaya, kind: DivisionKind | 'page', n: number): Verse[] {
    return index(riwaya).byDivision[kind].get(n) ?? [];
  },

  /** First verse of each division, for the juz / hizb lists. */
  divisionStarts(riwaya: Riwaya, kind: DivisionKind): { number: number; start: Verse }[] {
    return [...index(riwaya).byDivision[kind].entries()]
      .sort(([a], [b]) => a - b)
      .map(([number, verses]) => ({ number, start: verses[0]! }));
  },

  /**
   * Basmala displayed above a surah, from the verified text of each riwaya.
   * None for At-Tawba; in Hafs it is verse 1 of Al-Fatiha itself.
   */
  basmalaFor(riwaya: Riwaya, surah: number): string | null {
    if (surah === 9 || (riwaya === 'hafs' && surah === 1)) return null;
    return index(riwaya).bismillah;
  },

  allVerses(riwaya: Riwaya): Verse[] {
    return index(riwaya).verses;
  },

  /** Offline search on normalized text (harakat and Quranic signs ignored). */
  search(riwaya: Riwaya, query: string, limit = 50): Verse[] {
    const needle = normalizeArabicForSearch(query);
    if (needle.length < 2) return [];
    const idx = index(riwaya);
    idx.searchText ??= idx.verses.map((v) => normalizeArabicForSearch(v.text));
    const results: Verse[] = [];
    for (let i = 0; i < idx.verses.length && results.length < limit; i++) {
      if (idx.searchText[i]!.includes(needle)) results.push(idx.verses[i]!);
    }
    return results;
  },
};
