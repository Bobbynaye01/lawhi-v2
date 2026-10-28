import { Text, type TextProps, type TextStyle } from 'react-native';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useTypography, type TypeVariant } from '../../hooks/useTypography';

export type Tone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'accent'
  | 'wood'
  | 'onBrand'
  | 'danger'
  | 'success'
  | 'warning';

export function useToneColor(tone: Tone): string {
  const t = useTheme();
  const map: Record<Tone, string> = {
    primary: t.textPrimary,
    secondary: t.textSecondary,
    muted: t.muted,
    brand: t.primary,
    accent: t.accent,
    wood: t.secondary,
    onBrand: t.onPrimary,
    danger: t.danger,
    success: t.success,
    warning: t.warning,
  };
  return map[tone];
}

/** Lawhi text: one type scale, one set of tones, correct fonts per language. */
export function LawhiText({
  variant = 'body',
  tone = 'primary',
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  const type = useTypography();
  const color = useToneColor(tone);
  return <Text {...props} style={[type[variant], { color, textAlign: 'auto' }, style]} />;
}

/** Classical Arabic (adhkar, hadith) and Quranic text: always right-to-left. */
export function ArabicText({
  quran = false,
  size = 22,
  style,
  ...props
}: TextProps & { quran?: boolean; size?: number }) {
  const theme = useTheme();
  const base: TextStyle = {
    fontFamily: quran ? fonts.quran : fonts.classical,
    fontSize: size,
    // Amiri Quran needs generous leading for its stacked diacritics.
    lineHeight: Math.round(size * (quran ? 2.05 : 1.85)),
    color: theme.ink,
    writingDirection: 'rtl',
    textAlign: 'right',
  };
  return <Text {...props} style={[base, style]} />;
}

type LegacyVariant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'arabic';
const LEGACY: Record<LegacyVariant, [TypeVariant, Tone]> = {
  title: ['heading', 'primary'],
  heading: ['title', 'primary'],
  body: ['body', 'primary'],
  muted: ['body', 'secondary'],
  small: ['caption', 'secondary'],
  arabic: ['body', 'primary'],
};

/** Compatibility wrapper for screens written before the design system. */
export function AppText({ variant = 'body', ...props }: TextProps & { variant?: LegacyVariant }) {
  if (variant === 'arabic') return <ArabicText {...props} />;
  const [type, tone] = LEGACY[variant];
  return <LawhiText variant={type} tone={tone} {...props} />;
}
