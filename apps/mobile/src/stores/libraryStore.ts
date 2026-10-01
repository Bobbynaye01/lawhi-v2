import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

export interface DownloadedBook {
  uri: string;
  sizeBytes: number;
  downloadedAt: string;
}

interface LibraryState {
  downloads: Record<string, DownloadedBook>;
  /** Last PDF page read, per book. */
  pdfPages: Record<string, number>;
  /** Last text chapter opened, per book. */
  lastChapter: Record<string, string>;
  setDownloaded: (bookId: string, info: DownloadedBook) => void;
  removeDownload: (bookId: string) => void;
  savePdfPage: (bookId: string, page: number) => void;
  saveLastChapter: (bookId: string, chapterId: string) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      downloads: {},
      pdfPages: {},
      lastChapter: {},
      setDownloaded: (bookId, info) => set((s) => ({ downloads: { ...s.downloads, [bookId]: info } })),
      removeDownload: (bookId) =>
        set((s) => {
          const downloads = { ...s.downloads };
          delete downloads[bookId];
          return { downloads };
        }),
      savePdfPage: (bookId, page) => set((s) => ({ pdfPages: { ...s.pdfPages, [bookId]: page } })),
      saveLastChapter: (bookId, chapterId) =>
        set((s) => ({ lastChapter: { ...s.lastChapter, [bookId]: chapterId } })),
    }),
    { name: 'lawhi.library', storage: persistStorage, version: 1 },
  ),
);
