/**
 * Idempotent seed — safe to run on every deploy.
 *
 * - Reference data (Quran, reciters, adhkar, library) is inserted or refreshed
 *   from the verified JSON sources.
 * - Admin-controlled data (payment methods, causes, donation presets) is only
 *   created when missing: an admin's edits are never overwritten.
 * - Nothing is ever deleted.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeArabicForSearch } from '@lawhi/shared';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type PaymentOperator, type Riwaya } from '../../generated/prisma/client';

const dataDir = join(__dirname, '..', '..', '..', 'src', 'database', 'seed', 'data');
const readData = <T>(file: string): T => JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as T;
const quranData = <T>(file: string): T =>
  JSON.parse(readFileSync(require.resolve(`@lawhi/quran-data/${file}`), 'utf8')) as T;

type HafsRow = [number, number, string, number, number, number, number, 0 | 1];
type WarshRow = [number, number, string, number, number, number, number, number[]];

const BATCH = 1000;

async function seedQuran(prisma: PrismaClient) {
  const surahs = quranData<
    {
      id: number;
      nameAr: string;
      nameTranslit: string;
      nameFr: string;
      nameEn: string;
      revelationPlace: 'makkah' | 'madinah';
      bismillahPre: boolean;
      versesHafs: number;
      versesWarsh: number;
    }[]
  >('surahs.json');
  for (const surah of surahs) {
    await prisma.surah.upsert({ where: { id: surah.id }, create: surah, update: surah });
  }

  const manifest = quranData<{ hafs: { sha256: string }; warsh: { sha256: string } }>('manifest.json');
  const version = `${manifest.hafs.sha256}:${manifest.warsh.sha256}`;
  const current = await prisma.appConfig.findUnique({ where: { key: 'quran.dataVersion' } });
  if (current?.value === version) {
    console.warn('quran: up to date');
    return;
  }

  const hafs = quranData<{ verses: HafsRow[] }>('hafs.json').verses.map((v) => ({
    riwaya: 'hafs' as Riwaya,
    surah: v[0],
    verse: v[1],
    text: v[2],
    page: v[3],
    juz: v[4],
    hizb: v[5],
    rub: v[6],
    sajda: v[7] === 1,
    hafsVerses: [] as number[],
  }));
  const warsh = quranData<{ verses: WarshRow[] }>('warsh.json').verses.map((v) => ({
    riwaya: 'warsh' as Riwaya,
    surah: v[0],
    verse: v[1],
    text: v[2],
    page: v[3],
    juz: v[4],
    hizb: v[5],
    rub: v[6],
    sajda: false,
    hafsVerses: v[7],
  }));

  const rows = [...hafs, ...warsh];
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    // Bulk upsert with unnest: refreshes text/metadata if the verified data changed.
    await prisma.$executeRaw`
      INSERT INTO "Verse" ("riwaya", "surah", "verse", "text", "textSearch", "page", "juz", "hizb", "rub", "sajda", "hafsVerses")
      SELECT r.riwaya::"Riwaya", r.surah, r.verse, r.text, r.search, r.page, r.juz, r.hizb, r.rub, r.sajda,
             COALESCE(ARRAY(SELECT jsonb_array_elements_text(r.hafs)::int), '{}')
      FROM unnest(
        ${batch.map((v) => v.riwaya)}::text[],
        ${batch.map((v) => v.surah)}::int[],
        ${batch.map((v) => v.verse)}::int[],
        ${batch.map((v) => v.text)}::text[],
        ${batch.map((v) => normalizeArabicForSearch(v.text))}::text[],
        ${batch.map((v) => v.page)}::int[],
        ${batch.map((v) => v.juz)}::int[],
        ${batch.map((v) => v.hizb)}::int[],
        ${batch.map((v) => v.rub)}::int[],
        ${batch.map((v) => v.sajda)}::boolean[],
        ${batch.map((v) => JSON.stringify(v.hafsVerses))}::jsonb[]
      ) AS r(riwaya, surah, verse, text, search, page, juz, hizb, rub, sajda, hafs)
      ON CONFLICT ("riwaya", "surah", "verse") DO UPDATE SET
        "text" = EXCLUDED."text",
        "textSearch" = EXCLUDED."textSearch",
        "page" = EXCLUDED."page",
        "juz" = EXCLUDED."juz",
        "hizb" = EXCLUDED."hizb",
        "rub" = EXCLUDED."rub",
        "sajda" = EXCLUDED."sajda",
        "hafsVerses" = EXCLUDED."hafsVerses"`;
  }
  await prisma.appConfig.upsert({
    where: { key: 'quran.dataVersion' },
    create: { key: 'quran.dataVersion', value: version },
    update: { value: version },
  });
  console.warn(`quran: ${hafs.length} hafs + ${warsh.length} warsh verses`);
}

async function seedReciters(prisma: PrismaClient) {
  const { reciters, verifiedAt } = readData<{
    verifiedAt: string;
    reciters: {
      id: string;
      nameAr: string;
      nameFr: string;
      nameEn: string;
      riwaya: Riwaya;
      provider: 'everyayah';
      folder: string;
      enabled: boolean;
      sortOrder: number;
    }[];
  }>('reciters.json');
  for (const r of reciters) {
    const data = { ...r, verifiedAt: r.enabled ? new Date(verifiedAt) : null };
    await prisma.reciter.upsert({ where: { id: r.id }, create: data, update: data });
  }
  console.warn(`reciters: ${reciters.length}`);
}

async function seedAdhkar(prisma: PrismaClient) {
  const { categories } = readData<{
    categories: {
      id: string;
      kind: 'adhkar' | 'dua';
      titleAr: string;
      titleFr: string;
      titleEn: string;
      icon: string;
      sortOrder: number;
      items: {
        id: string;
        sortOrder: number;
        title: string | null;
        arabicText: string;
        repetitions: number;
        source: string;
        virtue: string | null;
      }[];
    }[];
  }>('adhkar.json');
  let count = 0;
  for (const { items, ...category } of categories) {
    await prisma.dhikrCategory.upsert({ where: { id: category.id }, create: category, update: category });
    for (const item of items) {
      const data = { ...item, categoryId: category.id };
      await prisma.dhikr.upsert({ where: { id: item.id }, create: data, update: data });
      count++;
    }
  }
  console.warn(`adhkar: ${categories.length} categories, ${count} items`);
}

/** archive.org links found broken on 2026-10-01 (404 / 401) — not published until replaced. */
const BROKEN_PDF_IDS = new Set(['nawawi40', 'adhkar_nawawi']);
/** The PDF catalogue and the text excerpts used different ids for the same book. */
const PDF_TO_TEXT_ID: Record<string, string> = { riyad: 'riyadh' };
const TITLES: Record<string, { fr: string; en: string }> = {
  bukhari: { fr: 'Sahih al-Bukhari', en: 'Sahih al-Bukhari' },
  muslim: { fr: 'Sahih Muslim', en: 'Sahih Muslim' },
  riyadh: { fr: 'Riyad as-Salihin', en: 'Riyad as-Salihin' },
  nawawi40: { fr: 'Les quarante hadiths d’an-Nawawi', en: 'An-Nawawi’s Forty Hadith' },
  hisn: { fr: 'La citadelle du musulman (Hisn al-Muslim)', en: 'Fortress of the Muslim (Hisn al-Muslim)' },
  bulugh: { fr: 'Bulugh al-Maram', en: 'Bulugh al-Maram' },
  adhkar_nawawi: { fr: 'Al-Adhkar d’an-Nawawi', en: 'Al-Adhkar by an-Nawawi' },
};

async function seedLibrary(prisma: PrismaClient) {
  const { pdfBooks, textBooks } = readData<{
    pdfBooks: { id: string; titleAr: string; authorAr: string; pdfUrl: string; sortOrder: number }[];
    textBooks: {
      id: string;
      titleAr: string;
      authorAr: string;
      description: string;
      isExcerpt: boolean;
      chapters: {
        id: string;
        title: string;
        sortOrder: number;
        entries: { id: string; number: number; text: string; narrator: string | null; reference: string | null }[];
      }[];
    }[];
  }>('library.json');
  const texts = new Map(textBooks.map((b) => [b.id, b]));

  for (const pdf of pdfBooks) {
    const id = PDF_TO_TEXT_ID[pdf.id] ?? pdf.id;
    const text = texts.get(id);
    const titles = TITLES[id];
    if (!text || !titles) throw new Error(`No text/titles for book ${id}`);
    const book = {
      titleAr: pdf.titleAr,
      titleFr: titles.fr,
      titleEn: titles.en,
      authorAr: text.authorAr,
      description: text.description,
      format: 'pdf' as const,
      pdfUrl: BROKEN_PDF_IDS.has(pdf.id) ? null : pdf.pdfUrl,
      isExcerpt: text.isExcerpt,
      sortOrder: pdf.sortOrder,
    };
    await prisma.book.upsert({ where: { id }, create: { id, ...book }, update: book });
    for (const { entries, ...chapter } of text.chapters) {
      const chapterData = { ...chapter, bookId: id };
      await prisma.bookChapter.upsert({ where: { id: chapter.id }, create: chapterData, update: chapterData });
      for (const entry of entries) {
        const entryData = { ...entry, chapterId: chapter.id };
        await prisma.bookEntry.upsert({ where: { id: entry.id }, create: entryData, update: entryData });
      }
    }
    texts.delete(id);
  }
  if (texts.size > 0) throw new Error(`Text books without catalogue entry: ${[...texts.keys()].join(', ')}`);
  console.warn(`library: ${pdfBooks.length} books`);
}

async function seedDonations(prisma: PrismaClient) {
  const data = readData<{
    presets: number[];
    causes: {
      slug: string;
      titleAr: string;
      titleFr: string;
      titleEn: string;
      descriptionAr: string;
      descriptionFr: string;
      descriptionEn: string;
      featured: boolean;
      sortOrder: number;
    }[];
    paymentMethods: { operator: PaymentOperator; name: string; sortOrder: number }[];
  }>('donations.json');

  for (const method of data.paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { operator: method.operator },
      create: { ...method, phoneNumber: null, enabled: false },
      update: {},
    });
  }
  for (const cause of data.causes) {
    await prisma.donationCause.upsert({ where: { slug: cause.slug }, create: cause, update: {} });
  }
  await prisma.appConfig.upsert({
    where: { key: 'donation.presets' },
    create: { key: 'donation.presets', value: data.presets },
    update: {},
  });
  console.warn(`donations: ${data.paymentMethods.length} methods (disabled until configured), ${data.causes.length} causes`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await seedQuran(prisma);
    await seedReciters(prisma);
    await seedAdhkar(prisma);
    await seedLibrary(prisma);
    await seedDonations(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
