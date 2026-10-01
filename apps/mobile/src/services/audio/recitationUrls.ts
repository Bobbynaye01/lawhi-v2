import type { VerseRef } from '@lawhi/shared';
import type { Reciter } from '../../repositories/contentRepository';

const pad = (n: number) => String(n).padStart(3, '0');

/** EveryAyah layout: /data/<folder>/<SSS><VVV>.mp3 (checked for all bundled reciters). */
export function verseAudioUrl(reciter: Reciter, ref: VerseRef): string {
  return `https://everyayah.com/data/${reciter.folder}/${pad(ref.surah)}${pad(ref.verse)}.mp3`;
}

export function verseAudioFileName(reciter: Reciter, ref: VerseRef): string {
  return `${reciter.folder}-${pad(ref.surah)}${pad(ref.verse)}.mp3`;
}
