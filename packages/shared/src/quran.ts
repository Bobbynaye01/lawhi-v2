export const RIWAYAT = ['hafs', 'warsh'] as const;
export type Riwaya = (typeof RIWAYAT)[number];

export const TOTAL_SURAHS = 114;
export const TOTAL_JUZ = 30;
export const TOTAL_HIZB = 60;
export const TOTAL_RUB = 240;

export interface VerseRef {
  surah: number;
  verse: number;
}

export interface SurahMeta {
  id: number;
  nameAr: string;
  nameTranslit: string;
  nameFr: string;
  nameEn: string;
  revelationPlace: 'makkah' | 'madinah';
  bismillahPre: boolean;
  versesHafs: number;
  versesWarsh: number;
}

export interface Verse extends VerseRef {
  text: string;
  page: number;
  juz: number;
  hizb: number;
  rub: number;
}

export type DivisionKind = 'juz' | 'hizb' | 'rub';

export const DIVISION_COUNTS: Record<DivisionKind, number> = {
  juz: TOTAL_JUZ,
  hizb: TOTAL_HIZB,
  rub: TOTAL_RUB,
};

export function verseKey(ref: VerseRef): string {
  return `${ref.surah}:${ref.verse}`;
}

export function parseVerseKey(key: string): VerseRef | null {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(key);
  if (!match) return null;
  const surah = Number(match[1]);
  const verse = Number(match[2]);
  if (surah < 1 || surah > TOTAL_SURAHS || verse < 1) return null;
  return { surah, verse };
}

export function compareVerseRefs(a: VerseRef, b: VerseRef): number {
  return a.surah - b.surah || a.verse - b.verse;
}

/**
 * Normalizes Arabic for search: drops harakat, Quranic annotation signs and
 * tatweel, and unifies alef / ya / ta marbuta forms.
 */
export function normalizeArabicForSearch(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\s+/g, ' ')
    .trim();
}
