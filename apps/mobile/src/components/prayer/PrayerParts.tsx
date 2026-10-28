import type { Prayer, PrayerDay } from '@lawhi/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { motion, radius, spacing } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useTheme } from '../../hooks/useTheme';
import { formatTime, useLocale } from '../../utils/localize';
import { Glow } from '../ui/Glow';
import { Icon } from '../ui/Icon';
import { ProgressBar } from '../ui/Progress';
import { useSurfaceStyle } from '../ui/Surface';
import { LawhiText } from '../ui/Text';

export const TIMELINE = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
type Slot = (typeof TIMELINE)[number];

const pad = (n: number) => String(n).padStart(2, '0');

/** Live second-by-second countdown to the next prayer. */
export function CountdownHero({
  next,
  previousAt,
  isTomorrow,
}: {
  next: { prayer: Prayer; at: Date };
  previousAt: Date | null;
  isTomorrow: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.floor((next.at.getTime() - now) / 1000));
  const clock = `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
  const span = previousAt ? next.at.getTime() - previousAt.getTime() : 0;
  const progress = span > 0 ? 1 - (next.at.getTime() - now) / span : 0;

  return (
    <View
      style={[styles.hero, useSurfaceStyle('brand')]}
      accessible
      accessibilityLabel={`${t('home.nextPrayer')} : ${t(`prayer.names.${next.prayer}`)}, ${formatTime(next.at, locale)}`}
    >
      <Glow width={300} height={220} color={theme.glow} opacity={0.18} style={{ top: -80, right: -60 }} />
      <LawhiText variant="overline" style={{ color: theme.onPrimaryContainer, opacity: 0.75 }}>
        {t('home.nextPrayer')}
        {isTomorrow ? ` · ${t('prayer.tomorrow')}` : ''}
      </LawhiText>
      <View style={styles.heroRow}>
        <LawhiText variant="display" style={{ color: theme.onPrimaryContainer, flex: 1 }}>
          {t(`prayer.names.${next.prayer}`)}
        </LawhiText>
        <LawhiText variant="numeral" style={{ color: theme.onPrimaryContainer }}>
          {formatTime(next.at, locale)}
        </LawhiText>
      </View>
      <LawhiText
        variant="numeralLarge"
        style={{ color: theme.onPrimaryContainer, fontSize: 44, lineHeight: 52, letterSpacing: 1 }}
        accessibilityLiveRegion="none"
      >
        {clock}
      </LawhiText>
      {span > 0 ? (
        <ProgressBar
          value={progress}
          color={theme.accent}
          track={theme.surface}
          height={3}
          style={{ marginTop: spacing.xs }}
        />
      ) : null}
    </View>
  );
}

/** The day as a vertical path of light: past, current, coming. */
export function PrayerTimeline({
  day,
  next,
  now,
}: {
  day: PrayerDay;
  next: { prayer: Prayer; at: Date } | null;
  now: Date;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  return (
    <View style={[styles.timeline, useSurfaceStyle('plain')]}>
      {TIMELINE.map((key, i) => {
        const at = new Date(day.times[key]);
        const isNext = next?.prayer === key && next.at.getTime() === at.getTime();
        const past = at.getTime() <= now.getTime();
        const last = i === TIMELINE.length - 1;
        return (
          <TimelineRow
            key={key}
            slot={key}
            label={t(`prayer.names.${key}`)}
            hint={key === 'sunrise' ? t('prayer.sunriseHint') : undefined}
            time={formatTime(at, locale)}
            state={isNext ? 'next' : past ? 'past' : 'coming'}
            last={last}
            a11y={`${t(`prayer.names.${key}`)} ${formatTime(at, locale)}${isNext ? `, ${t('prayer.next')}` : ''}`}
            colors={theme}
          />
        );
      })}
    </View>
  );
}

function TimelineRow({
  slot,
  label,
  hint,
  time,
  state,
  last,
  a11y,
  colors,
}: {
  slot: Slot;
  label: string;
  hint?: string;
  time: string;
  state: 'past' | 'next' | 'coming';
  last: boolean;
  a11y: string;
  colors: ReturnType<typeof useTheme>;
}) {
  const reduceMotion = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (state !== 'next' || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: motion.native }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: motion.native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, reduceMotion, pulse]);

  const minor = slot === 'sunrise';
  const dot = state === 'next' ? colors.accent : state === 'past' ? colors.border : colors.primary;
  const tone = state === 'past' ? 'muted' : 'primary';

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={[styles.row, state === 'next' && { backgroundColor: colors.accentSoft }]}
    >
      <View style={styles.rail}>
        <View style={[styles.line, { backgroundColor: colors.divider }, last && { bottom: '50%' }]} />
        {state === 'next' ? (
          <Animated.View
            style={[
              styles.halo,
              {
                backgroundColor: colors.accent,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
              },
            ]}
          />
        ) : null}
        {minor ? (
          <View style={[styles.sunDot, { backgroundColor: colors.surface }]}>
            <Icon name="sun" size={14} color={state === 'past' ? colors.muted : colors.accent} />
          </View>
        ) : (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: state === 'coming' ? colors.surface : dot,
                borderColor: dot,
                width: state === 'next' ? 13 : 10,
                height: state === 'next' ? 13 : 10,
              },
            ]}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <LawhiText
          variant={state === 'next' ? 'title' : minor ? 'body' : 'subtitle'}
          tone={minor && state !== 'next' ? 'secondary' : tone}
        >
          {label}
        </LawhiText>
        {hint ? (
          <LawhiText variant="caption" tone="muted">
            {hint}
          </LawhiText>
        ) : null}
      </View>
      <LawhiText
        variant="numeral"
        tone={tone}
        style={state === 'next' ? { fontSize: 20 } : minor ? { fontSize: 15 } : undefined}
      >
        {time}
      </LawhiText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xs, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  timeline: { borderRadius: radius.xl, paddingVertical: spacing.sm, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  rail: { width: 22, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  dot: { borderRadius: 7, borderWidth: 1.5 },
  sunDot: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  halo: { position: 'absolute', width: 13, height: 13, borderRadius: 7 },
});
