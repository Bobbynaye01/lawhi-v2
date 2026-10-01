import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * AsyncStorage can throw (full disk, private browsing on web). A failed read
 * falls back to defaults and a failed write is ignored: the app keeps working
 * with in-memory state rather than crashing.
 */
const safeStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Ignored on purpose — see above.
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Ignored on purpose — see above.
    }
  },
};

export const persistStorage = createJSONStorage(() => safeStorage);
