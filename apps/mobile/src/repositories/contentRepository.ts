import type { Riwaya } from '@lawhi/shared';

export interface Dhikr {
  id: string;
  sortOrder: number;
  title: string | null;
  arabicText: string;
  /** Only from a recognised published translation — currently none is bundled. */
  translationFr?: string | null;
  translationEn?: string | null;
  repetitions: number;
  source: string;
  virtue: string | null;
}

export interface DhikrCategory {
  id: string;
  kind: 'adhkar' | 'dua';
  titleAr: string;
  titleFr: string;
  titleEn: string;
  icon: string;
  sortOrder: number;
  items: Dhikr[];
}

export interface BookEntry {
  id: string;
  number: number;
  text: string;
  narrator: string | null;
  reference: string | null;
}

export interface BookChapter {
  id: string;
  title: string;
  sortOrder: number;
  entries: BookEntry[];
}

export interface Book {
  id: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  authorAr: string;
  description: string;
  pdfUrl: string | null;
  pdfSizeMB: number | null;
  isExcerpt: boolean;
  sortOrder: number;
  chapters: BookChapter[];
}

export interface Reciter {
  id: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  riwaya: Riwaya;
  provider: 'everyayah';
  folder: string;
  enabled: boolean;
  sortOrder: number;
}
let adhkar: DhikrCategory[] | null = null;
let books: Book[] | null = null;
let reciters: Reciter[] | null = null;

/** Validated religious content bundled with the app (packages/content), available offline. */
export const contentRepository = {
  categories(kind?: DhikrCategory['kind']): DhikrCategory[] {
    adhkar ??= (require('@lawhi/content/adhkar.json') as { categories: DhikrCategory[] })
      .categories;
    return kind ? adhkar.filter((c) => c.kind === kind) : adhkar;
  },

  category(id: string): DhikrCategory | undefined {
    return this.categories().find((c) => c.id === id);
  },

  books(): Book[] {
    books ??= (require('@lawhi/content/library.json') as { books: Book[] }).books;
    return books;
  },

  book(id: string): Book | undefined {
    return this.books().find((b) => b.id === id);
  },

  /** Only reciters whose audio files were verified on the provider. */
  reciters(riwaya: Riwaya): Reciter[] {
    reciters ??= (require('@lawhi/content/reciters.json') as { reciters: Reciter[] }).reciters;
    return reciters.filter((r) => r.riwaya === riwaya && r.enabled);
  },

  reciter(id: string): Reciter | undefined {
    return this.reciters('hafs')
      .concat(this.reciters('warsh'))
      .find((r) => r.id === id);
  },
};
