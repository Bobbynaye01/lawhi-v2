import { Directory, File, Paths } from 'expo-file-system';
import type { Book } from '../repositories/contentRepository';
import { useLibraryStore } from '../stores/libraryStore';

/** Books live in the document directory: unlike the cache, the OS never purges it. */
const booksDir = () => new Directory(Paths.document, 'books');

export interface DownloadHandle {
  promise: Promise<void>;
  cancel: () => void;
}

export function downloadBook(book: Book, onProgress: (ratio: number) => void): DownloadHandle {
  if (!book.pdfUrl) throw new Error('book_has_no_pdf');
  const dir = booksDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, `${book.id}.pdf`);
  if (target.exists) target.delete();

  const controller = new AbortController();
  const task = File.createDownloadTask(book.pdfUrl, target, {
    signal: controller.signal,
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress(Math.min(1, bytesWritten / totalBytes));
    },
  });

  const promise = (async () => {
    const file = await task.downloadAsync();
    if (!file) throw new Error('download_cancelled');
    // archive.org answers some errors with an HTML page: refuse anything that is not a PDF.
    const handle = file.open();
    let head: Uint8Array;
    try {
      head = handle.readBytes(5);
    } finally {
      handle.close();
    }
    if (String.fromCharCode(...head) !== '%PDF-') {
      file.delete();
      throw new Error('not_a_pdf');
    }
    useLibraryStore.getState().setDownloaded(book.id, {
      uri: file.uri,
      sizeBytes: file.size ?? 0,
      downloadedAt: new Date().toISOString(),
    });
  })();

  return {
    promise,
    cancel: () => controller.abort(),
  };
}

export function deleteBook(bookId: string) {
  const file = new File(booksDir(), `${bookId}.pdf`);
  if (file.exists) file.delete();
  useLibraryStore.getState().removeDownload(bookId);
}

/** Drops entries whose file disappeared (app data cleared, reinstall). */
export function reconcileDownloads() {
  const { downloads, removeDownload } = useLibraryStore.getState();
  for (const [bookId, info] of Object.entries(downloads)) {
    if (!new File(info.uri).exists) removeDownload(bookId);
  }
}
