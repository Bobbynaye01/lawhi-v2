import type { VerseRef } from '@lawhi/shared';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';
import type { Reciter } from '../../repositories/contentRepository';
import { cachedAudioUri } from './audioCache';
import { verseAudioFileName, verseAudioUrl } from './recitationUrls';

export type AudioError = 'network' | 'playback';

interface RecitationState {
  reciter: Reciter | null;
  queue: VerseRef[];
  index: number;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  error: AudioError | null;
  position: number;
  duration: number;
}

/** Observable state for the UI; the player itself lives outside React. */
export const useRecitationStore = create<RecitationState>(() => ({
  reciter: null,
  queue: [],
  index: 0,
  status: 'idle',
  error: null,
  position: 0,
  duration: 0,
}));

const PREFETCH_AHEAD = 2;
let player: AudioPlayer | null = null;
let loadToken = 0;
let audioModeReady = false;

function getPlayer(): AudioPlayer {
  if (player) return player;
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', onStatus);
  return player;
}

function onStatus(status: AudioStatus) {
  const state = useRecitationStore.getState();
  if (status.didJustFinish) {
    void recitation.next({ fromAutoAdvance: true });
    return;
  }
  if (state.status === 'loading' && !status.isLoaded) return;
  useRecitationStore.setState({
    position: status.currentTime,
    duration: status.duration,
    status: status.playing ? 'playing' : state.status === 'loading' ? 'loading' : 'paused',
  });
}

async function ensureAudioMode() {
  if (audioModeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  audioModeReady = true;
}

function prefetch(reciter: Reciter, queue: VerseRef[], from: number) {
  for (const ref of queue.slice(from + 1, from + 1 + PREFETCH_AHEAD)) {
    cachedAudioUri(verseAudioUrl(reciter, ref), verseAudioFileName(reciter, ref)).catch(() => undefined);
  }
}

async function playIndex(index: number) {
  const { reciter, queue } = useRecitationStore.getState();
  const ref = queue[index];
  if (!reciter || !ref) return;
  const token = ++loadToken;
  useRecitationStore.setState({ index, status: 'loading', error: null, position: 0, duration: 0 });

  let uri: string;
  try {
    uri = await cachedAudioUri(verseAudioUrl(reciter, ref), verseAudioFileName(reciter, ref));
  } catch {
    if (token === loadToken) useRecitationStore.setState({ status: 'error', error: 'network' });
    return;
  }
  if (token !== loadToken) return; // the user moved on meanwhile

  try {
    await ensureAudioMode();
    const p = getPlayer();
    p.replace(uri);
    p.play();
    p.setActiveForLockScreen(true, { title: `${ref.surah}:${ref.verse}`, artist: reciter.nameAr });
    prefetch(reciter, queue, index);
  } catch {
    useRecitationStore.setState({ status: 'error', error: 'playback' });
  }
}

export const recitation = {
  /** Plays `queue` (consecutive verses) starting at `startIndex` with the given reciter. */
  async start(reciter: Reciter, queue: VerseRef[], startIndex = 0) {
    useRecitationStore.setState({ reciter, queue });
    await playIndex(startIndex);
  },

  async toggle() {
    const { status, index } = useRecitationStore.getState();
    if (status === 'playing') {
      getPlayer().pause();
      useRecitationStore.setState({ status: 'paused' });
    } else if (status === 'paused') {
      getPlayer().play();
      useRecitationStore.setState({ status: 'playing' });
    } else if (status === 'error') {
      await playIndex(index);
    }
  },

  async next(options: { fromAutoAdvance?: boolean } = {}) {
    const { index, queue } = useRecitationStore.getState();
    if (index + 1 < queue.length) await playIndex(index + 1);
    else if (options.fromAutoAdvance) recitation.stop();
  },

  async previous() {
    const { index } = useRecitationStore.getState();
    await playIndex(Math.max(0, index - 1));
  },

  async jumpTo(index: number) {
    await playIndex(index);
  },

  /** Restarts the current verse with another reciter. */
  async changeReciter(reciter: Reciter) {
    const { queue, index, status } = useRecitationStore.getState();
    useRecitationStore.setState({ reciter });
    if (status !== 'idle' && queue.length > 0) await playIndex(index);
  },

  stop() {
    loadToken++;
    if (player) {
      player.pause();
      player.clearLockScreenControls();
    }
    useRecitationStore.setState({ queue: [], index: 0, status: 'idle', error: null, position: 0, duration: 0 });
  },
};
