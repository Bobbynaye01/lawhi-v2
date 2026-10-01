import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

export interface SavedPlace {
  name: string;
  country: string | null;
  latitude: number;
  longitude: number;
  source: 'gps' | 'search';
  updatedAt: string;
}

interface LocationState {
  place: SavedPlace | null;
  setPlace: (place: Omit<SavedPlace, 'updatedAt'>) => void;
  clear: () => void;
}

/** Last known place — kept offline so prayer times and Qibla work without network. */
export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      place: null,
      setPlace: (place) => set({ place: { ...place, updatedAt: new Date().toISOString() } }),
      clear: () => set({ place: null }),
    }),
    { name: 'lawhi.location', storage: persistStorage, version: 1 },
  ),
);
