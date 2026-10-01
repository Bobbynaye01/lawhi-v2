import {
  DEFAULT_MADHAB,
  DEFAULT_PRAYER_METHOD,
  type Locale,
  type Madhab,
  type NotificationMode,
  type PrayerMethodId,
  type Riwaya,
} from '@lawhi/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export const DEFAULT_RECITER_ID = 'ar.alafasy';
export const FONT_SCALE = { min: 0.8, max: 2, step: 0.1 } as const;

export interface SettingsState {
  /** null until the user (or device language detection) picks one. */
  locale: Locale | null;
  theme: ThemePreference;
  riwaya: Riwaya;
  /** Selected reciter per riwaya; null when no reciter exists for it (Warsh today). */
  reciterByRiwaya: Record<Riwaya, string | null>;
  quranFontScale: number;
  prayerMethod: PrayerMethodId;
  madhab: Madhab;
  notificationMode: NotificationMode;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
  setRiwaya: (riwaya: Riwaya) => void;
  setReciter: (riwaya: Riwaya, reciterId: string | null) => void;
  setQuranFontScale: (scale: number) => void;
  setPrayerMethod: (method: PrayerMethodId) => void;
  setMadhab: (madhab: Madhab) => void;
  setNotificationMode: (mode: NotificationMode) => void;
}

const clampScale = (scale: number) =>
  Math.round(Math.min(FONT_SCALE.max, Math.max(FONT_SCALE.min, scale)) * 10) / 10;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: null,
      theme: 'system',
      riwaya: 'hafs',
      reciterByRiwaya: { hafs: DEFAULT_RECITER_ID, warsh: null },
      quranFontScale: 1,
      prayerMethod: DEFAULT_PRAYER_METHOD,
      madhab: DEFAULT_MADHAB,
      notificationMode: 'notification',
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setRiwaya: (riwaya) => set({ riwaya }),
      setReciter: (riwaya, reciterId) =>
        set((s) => ({ reciterByRiwaya: { ...s.reciterByRiwaya, [riwaya]: reciterId } })),
      setQuranFontScale: (scale) => set({ quranFontScale: clampScale(scale) }),
      setPrayerMethod: (prayerMethod) => set({ prayerMethod }),
      setMadhab: (madhab) => set({ madhab }),
      setNotificationMode: (notificationMode) => set({ notificationMode }),
    }),
    { name: 'lawhi.settings', storage: persistStorage, version: 1 },
  ),
);
