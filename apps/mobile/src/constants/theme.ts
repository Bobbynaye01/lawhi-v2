/**
 * Lawhi palette — the green and gold of the Flutter app, with a real dark
 * variant (the Flutter app returned the light theme for dark mode).
 */
export interface Palette {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  quranText: string;
}

export const lightPalette: Palette = {
  background: '#F8F5EC',
  surface: '#FFFCF6',
  card: '#F3EADB',
  border: '#E3D8C3',
  text: '#1A2820',
  textMuted: '#5E6A62',
  primary: '#123B2F',
  onPrimary: '#FFFFFF',
  accent: '#9A7A12',
  danger: '#B3261E',
  success: '#2E7D4F',
  warning: '#8A5A00',
  quranText: '#14231B',
};

export const darkPalette: Palette = {
  background: '#0E1713',
  surface: '#15211B',
  card: '#1C2B24',
  border: '#2C3D34',
  text: '#ECE6D8',
  textMuted: '#A8B2AB',
  primary: '#7FC4A4',
  onPrimary: '#0E1713',
  accent: '#E1C25A',
  danger: '#F2B8B5',
  success: '#8FD3AE',
  warning: '#F0C36A',
  quranText: '#F3EEDF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

/** Arabic text uses Amiri; Latin UI text uses the system font. */
export const fonts = {
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
} as const;

/** Minimum touch target recommended by both platforms' accessibility guidelines. */
export const MIN_TOUCH = 44;
