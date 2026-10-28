import { PRAYERS, type Prayer, type PrayerDay } from '@lawhi/shared';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { motion, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatTime, useLocale } from '../../utils/localize';
import { Glow } from '../ui/Glow';
import { LawhiText } from '../ui/Text';

const SAMPLES = 32;
const SUN = 12;

/**
 * The day as the sun's path: a low elliptical arc from just before Fajr to just
 * after ʿIsha, each prayer a mark on it, a point of light at the current moment.
 * Drawn physically (dawn on the left) in every language.
 */
export function DayArc({
  day,
  now,
  next,
  width,
  rise = 64,
}: {
  day: PrayerDay;
  now: Date;
  next: Prayer | null;
  width: number;
  /** Highest point of the arc above the horizon, in points. */
  rise?: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = useLocale();
  const rx = width / 2 - 10;
  const ry = Math.min(rise, width * 0.2);
  const cx = width / 2;
  const cy = ry + 12;
  const height = cy + 6;

  const times = PRAYERS.map((p) => new Date(day.times[p]).getTime());
  const start = times[0]! - 40 * 60_000;
  const end = times[4]! + 40 * 60_000;
  const fraction = (ms: number) => Math.max(0, Math.min(1, (ms - start) / (end - start)));
  const point = (f: number) => {
    const angle = Math.PI * (1 - f);
    return { x: cx + rx * Math.cos(angle), y: cy - ry * Math.sin(angle) };
  };

  // The light's path, sampled so it can be driven by a single native value.
  const path = useMemo(() => {
    const input = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
    const pts = input.map((f) => {
      const angle = Math.PI * (1 - f);
      return { x: cx + rx * Math.cos(angle) - SUN / 2, y: cy - ry * Math.sin(angle) - SUN / 2 };
    });
    return { input, x: pts.map((p) => p.x), y: pts.map((p) => p.y) };
  }, [cx, cy, rx, ry]);

  const current = fraction(now.getTime());
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: current,
      duration: 1500,
      delay: 300,
      easing: motion.emphasized,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [current, progress]);

  const arc = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
  const done = point(current);
  const elapsed = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${done.x} ${done.y}`;

  return (
    <View
      style={{ width, height: height + 24 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        <Path d={arc} stroke={theme.border} strokeWidth={1.2} fill="none" strokeDasharray="1.5 5" strokeLinecap="round" />
        <Path d={elapsed} stroke={theme.accent} strokeOpacity={0.55} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <Path d={`M ${cx - rx - 6} ${cy} H ${cx + rx + 6}`} stroke={theme.divider} strokeWidth={1} />
        {PRAYERS.map((p, i) => {
          const { x, y } = point(fraction(times[i]!));
          const isNext = p === next;
          return (
            <Circle
              key={p}
              cx={x}
              cy={y}
              r={isNext ? 4.5 : 2.8}
              fill={isNext ? theme.accent : theme.surface}
              stroke={isNext ? theme.accent : theme.muted}
              strokeWidth={1.2}
            />
          );
        })}
      </Svg>

      <Animated.View
        style={[
          styles.sun,
          {
            transform: [
              { translateX: progress.interpolate({ inputRange: path.input, outputRange: path.x }) },
              { translateY: progress.interpolate({ inputRange: path.input, outputRange: path.y }) },
            ],
          },
        ]}
      >
        <Glow width={60} height={60} color={theme.glow} opacity={0.6} style={{ left: -24, top: -24 }} />
        <View style={[styles.sunCore, { backgroundColor: theme.glow }]} />
      </Animated.View>

      <LawhiText variant="caption" tone="muted" style={[styles.label, { top: height + 2, left: 0 }]}>
        {t('prayer.names.fajr')} {formatTime(new Date(times[0]!), locale)}
      </LawhiText>
      <LawhiText variant="caption" tone="muted" style={[styles.label, { top: height + 2, right: 0 }]}>
        {t('prayer.names.isha')} {formatTime(new Date(times[4]!), locale)}
      </LawhiText>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', left: 0, top: 0, width: SUN, height: SUN },
  sunCore: { width: SUN, height: SUN, borderRadius: SUN / 2 },
  label: { position: 'absolute', paddingHorizontal: spacing.xs },
});
