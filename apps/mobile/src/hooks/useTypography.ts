import { useTranslation } from 'react-i18next';
import type { TextStyle } from 'react-native';
import { fonts } from '../constants/theme';

export type TypeVariant =
  | 'display'
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'overline'
  | 'numeral'
  | 'numeralLarge';

/**
 * Type scale. Latin UI: Fraunces for display/titles, Manrope for text.
 * Arabic UI: IBM Plex Sans Arabic throughout, with taller line heights.
 */
export function typeScale(arabic: boolean): Record<TypeVariant, TextStyle> {
  const display = arabic ? fonts.arabicSemiBold : fonts.displaySemiBold;
  const displayMedium = arabic ? fonts.arabicMedium : fonts.displayMedium;
  const text = arabic ? fonts.arabicRegular : fonts.regular;
  const textMedium = arabic ? fonts.arabicMedium : fonts.medium;
  const textBold = arabic ? fonts.arabicSemiBold : fonts.semiBold;
  const lh = (size: number, latin: number) => Math.round(size * (arabic ? latin + 0.25 : latin));
  return {
    display: { fontFamily: display, fontSize: 34, lineHeight: lh(34, 1.12), letterSpacing: arabic ? 0 : -0.6 },
    heading: { fontFamily: display, fontSize: 26, lineHeight: lh(26, 1.18), letterSpacing: arabic ? 0 : -0.3 },
    title: { fontFamily: displayMedium, fontSize: 20, lineHeight: lh(20, 1.25), letterSpacing: arabic ? 0 : -0.1 },
    subtitle: { fontFamily: textBold, fontSize: 16, lineHeight: lh(16, 1.35) },
    body: { fontFamily: text, fontSize: 15.5, lineHeight: lh(15.5, 1.5) },
    bodyStrong: { fontFamily: textMedium, fontSize: 15.5, lineHeight: lh(15.5, 1.5) },
    caption: { fontFamily: text, fontSize: 13, lineHeight: lh(13, 1.4) },
    overline: {
      fontFamily: textBold,
      fontSize: arabic ? 13 : 11.5,
      lineHeight: lh(12, 1.3),
      letterSpacing: arabic ? 0 : 1.4,
      textTransform: arabic ? 'none' : 'uppercase',
    },
    // Times and counters: Manrope's lining figures in every language.
    numeral: { fontFamily: fonts.semiBold, fontSize: 17, fontVariant: ['tabular-nums'] },
    numeralLarge: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 44,
      lineHeight: 50,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
  };
}

export function useIsArabicUi(): boolean {
  const { i18n } = useTranslation();
  return i18n.language === 'ar';
}

const cache = { latin: typeScale(false), arabic: typeScale(true) };

export function useTypography(): Record<TypeVariant, TextStyle> {
  return useIsArabicUi() ? cache.arabic : cache.latin;
}
