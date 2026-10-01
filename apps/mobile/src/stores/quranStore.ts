import type { Riwaya, VerseRef } from '@lawhi/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

export interface Bookmark extends VerseRef {
  riwaya: Riwaya;
  createdAt: string;
}

interface QuranState {
  lastRead: Partial<Record<Riwaya, VerseRef & { at: string }>>;
  bookmarks: Bookmark[];
  saveLastRead: (riwaya: Riwaya, ref: VerseRef) => void;
  toggleBookmark: (riwaya: Riwaya, ref: VerseRef) => void;
  isBookmarked: (riwaya: Riwaya, ref: VerseRef) => boolean;
}

const same = (a: Bookmark, riwaya: Riwaya, ref: VerseRef) =>
  a.riwaya === riwaya && a.surah === ref.surah && a.verse === ref.verse;

export const useQuranStore = create<QuranState>()(
  persist(
    (set, get) => ({
      lastRead: {},
      bookmarks: [],
      saveLastRead: (riwaya, ref) =>
        set((s) => ({
          lastRead: { ...s.lastRead, [riwaya]: { ...ref, at: new Date().toISOString() } },
        })),
      toggleBookmark: (riwaya, ref) =>
        set((s) =>
          s.bookmarks.some((b) => same(b, riwaya, ref))
            ? { bookmarks: s.bookmarks.filter((b) => !same(b, riwaya, ref)) }
            : {
                bookmarks: [
                  {
                    riwaya,
                    surah: ref.surah,
                    verse: ref.verse,
                    createdAt: new Date().toISOString(),
                  },
                  ...s.bookmarks,
                ],
              },
        ),
      isBookmarked: (riwaya, ref) => get().bookmarks.some((b) => same(b, riwaya, ref)),
    }),
    { name: 'lawhi.quran', storage: persistStorage, version: 1 },
  ),
);
