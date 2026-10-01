import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Verse recitations are cached in the OS cache directory (the system may purge
 * it when space is low). On web the browser cache is used instead.
 */
const dir = () => new Directory(Paths.cache, 'recitations');

/** Returns a playable URI: the cached file, downloading it first when needed. */
export async function cachedAudioUri(url: string, fileName: string): Promise<string> {
  if (Platform.OS === 'web') return url;
  const folder = dir();
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  const file = new File(folder, fileName);
  if (file.exists && (file.size ?? 0) > 0) return file.uri;
  const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
  return downloaded.uri;
}

export function cachedAudioSizeBytes(): number {
  if (Platform.OS === 'web') return 0;
  const folder = dir();
  return folder.exists ? (folder.size ?? 0) : 0;
}

export function clearAudioCache() {
  if (Platform.OS === 'web') return;
  const folder = dir();
  if (folder.exists) folder.delete();
}
