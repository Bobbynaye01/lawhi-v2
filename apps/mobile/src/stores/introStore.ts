import { create } from 'zustand';

/** Session-only: the opening sequence plays once per cold start. */
export const useIntroStore = create<{ done: boolean; markDone: () => void }>((set) => ({
  done: false,
  markDone: () => set({ done: true }),
}));
