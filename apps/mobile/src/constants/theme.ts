import { Easing, Platform } from 'react-native';

/**
 * Lawhi design tokens.
 *
 * Light — "ivoire & noyer": warm ivory paper, walnut ink, a deep green used
 * sparingly, and the gold of lamp light.
 * Dark — "lumière de lampe": dark wood rather than black, warm ivory text,
 * the same green lifted for contrast.
 */
export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  textPrimary: string;
  textSecondary: string;
  muted: string;
  border: string;
  divider: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  accent: string;
  accentSoft: string;
  /** Ink of Quranic and Arabic religious text. */
  ink: string;
  /** Warm light used by glows and highlights. */
  glow: string;
  shadow: string;
  danger: string;
  success: string;
  warning: string;
  /** Overlay drawn on the Lawh photograph (intro, mini-lawh). */
  scrim: string;
}

export const lightPalette: Palette = {
  background: '#F5F0E6',
  surface: '#FBF8F2',
  surfaceElevated: '#FFFDF9',
  surfaceSunken: '#EEE6D8',
  textPrimary: '#2B2018',
  textSecondary: '#66584B',
  muted: '#968777',
  border: '#E3D8C6',
  divider: '#ECE3D5',
  primary: '#1E4A3B',
  onPrimary: '#F8F3E9',
  primaryContainer: '#E2EBE3',
  onPrimaryContainer: '#183D30',
  secondary: '#8A5A34',
  secondaryContainer: '#F1E4D2',
  accent: '#B8873A',
  accentSoft: '#F4E7CC',
  ink: '#1F1712',
  glow: '#F2C77A',
  shadow: '#3B2A1C',
  danger: '#A8382B',
  success: '#2F6E4E',
  warning: '#8C5E12',
  scrim: '#0D0906',
};

export const darkPalette: Palette = {
  background: '#13100D',
  surface: '#1B1612',
  surfaceElevated: '#241E18',
  surfaceSunken: '#0F0C0A',
  textPrimary: '#F2E9DB',
  textSecondary: '#C3B5A3',
  muted: '#8E8071',
  border: '#332A22',
  divider: '#2A231C',
  primary: '#86BFA2',
  onPrimary: '#0F1C16',
  primaryContainer: '#1C3328',
  onPrimaryContainer: '#CFE6D9',
  secondary: '#C89361',
  secondaryContainer: '#2E2219',
  accent: '#E2B467',
  accentSoft: '#3A2D1B',
  ink: '#F3EBDC',
  glow: '#E9A94F',
  shadow: '#000000',
  danger: '#EBA295',
  success: '#93CDAE',
  warning: '#E7C27A',
  scrim: '#080604',
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Minimum touch target recommended by both platforms' accessibility guidelines. */
export const MIN_TOUCH = 44;

/** Font families (one family name per weight, as loaded in App.tsx). */
export const fonts = {
  displayMedium: 'Fraunces_500Medium',
  displaySemiBold: 'Fraunces_600SemiBold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  arabicRegular: 'IBMPlexSansArabic_400Regular',
  arabicMedium: 'IBMPlexSansArabic_500Medium',
  arabicSemiBold: 'IBMPlexSansArabic_600SemiBold',
  /** Quranic text — Amiri Quran is designed for the mushaf. */
  quran: 'AmiriQuran_400Regular',
  /** Other classical Arabic texts (adhkar, hadith). */
  classical: 'Amiri_400Regular',
} as const;

/** Motion language: calm, eased, never bouncy. */
export const motion = {
  fast: 160,
  base: 260,
  slow: 480,
  standard: Easing.bezier(0.2, 0, 0, 1),
  emphasized: Easing.bezier(0.05, 0.7, 0.1, 1),
  exit: Easing.bezier(0.3, 0, 1, 1),
  spring: { damping: 18, stiffness: 180, mass: 1 },
  /** The native driver is unavailable on web, where Animated falls back to JS. */
  native: Platform.OS !== 'web',
} as const;
