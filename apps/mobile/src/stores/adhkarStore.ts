import { localDateString } from '@lawhi/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

/** Device-local day: counters reset at local midnight. */
const today = () => localDateString(new Date());

interface AdhkarState {
  /** Counters reset automatically every day. */
  day: string;
  counts: Record<string, number>;
  favorites: string[];
  tasbih: number;
  increment: (dhikrId: string, max: number) => number;
  resetCategory: (dhikrIds: string[]) => void;
  countFor: (dhikrId: string) => number;
  toggleFavorite: (dhikrId: string) => void;
  incrementTasbih: () => void;
  resetTasbih: () => void;
}

export const useAdhkarStore = create<AdhkarState>()(
  persist(
    (set, get) => {
      const fresh = () => (get().day === today() ? get().counts : {});
      return {
        day: today(),
        counts: {},
        favorites: [],
        tasbih: 0,
        countFor: (id) => (get().day === today() ? (get().counts[id] ?? 0) : 0),
        increment: (id, max) => {
          const counts = fresh();
          const next = Math.min(max, (counts[id] ?? 0) + 1);
          set({ day: today(), counts: { ...counts, [id]: next } });
          return next;
        },
        resetCategory: (ids) => {
          const counts = { ...fresh() };
          for (const id of ids) delete counts[id];
          set({ day: today(), counts });
        },
        toggleFavorite: (id) =>
          set((s) => ({
            favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
          })),
        incrementTasbih: () => set((s) => ({ tasbih: s.tasbih + 1 })),
        resetTasbih: () => set({ tasbih: 0 }),
      };
    },
    { name: 'lawhi.adhkar', storage: persistStorage, version: 1 },
  ),
);
