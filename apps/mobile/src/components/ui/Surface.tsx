import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '../../constants/theme';
import { useIsDark, useTheme } from '../../hooks/useTheme';

export type SurfaceVariant = 'plain' | 'elevated' | 'sunken' | 'outline' | 'brand';

/**
 * Surfaces are paper, not boxes: hairline borders, a whisper of shadow on
 * elevated ones, never heavy drop shadows.
 */
export function useSurfaceStyle(variant: SurfaceVariant): ViewStyle {
  const t = useTheme();
  const dark = useIsDark();
  const shadow: ViewStyle =
    Platform.OS === 'android'
      ? { elevation: dark ? 0 : 1.5 }
      : {
          shadowColor: t.shadow,
          shadowOpacity: dark ? 0 : 0.07,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
        };
  switch (variant) {
    case 'elevated':
      return { backgroundColor: t.surfaceElevated, borderWidth: 1, borderColor: t.divider, ...shadow };
    case 'sunken':
      return { backgroundColor: t.surfaceSunken };
    case 'outline':
      return { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border };
    case 'brand':
      return { backgroundColor: t.primaryContainer };
    default:
      return { backgroundColor: t.surface, borderWidth: 1, borderColor: t.divider };
  }
}

export function Surface({
  children,
  variant = 'plain',
  padded = true,
  style,
}: {
  children: ReactNode;
  variant?: SurfaceVariant;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const surface = useSurfaceStyle(variant);
  return (
    <View style={[{ borderRadius: radius.lg }, padded && { padding: spacing.lg, gap: spacing.sm }, surface, style]}>
      {children}
    </View>
  );
}

/** Legacy name kept for screens written before the design system. */
export const Card = Surface;
