import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { fonts, motion, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { ArchShape } from '../ui/Arch';
import { Tappable } from '../ui/Tappable';
import { ArabicText, LawhiText } from '../ui/Text';

/** A number set inside a small lawh arch — surah numbers, verse markers. */
export function ArchNumber({
  value,
  size = 30,
  active = false,
}: {
  value: number;
  size?: number;
  active?: boolean;
}) {
  const theme = useTheme();
  const h = size * 1.15;
  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <ArchShape
        width={size}
        height={h}
        stroke={active ? theme.accent : theme.border}
        fill={active ? theme.accentSoft : 'transparent'}
        strokeWidth={1}
        dome={0.6}
        style={StyleSheet.absoluteFill}
      />
      <LawhiText
        style={{
          fontFamily: fonts.semiBold,
          fontSize: size * 0.38,
          color: active ? theme.textPrimary : theme.textSecondary,
          marginTop: size * 0.12,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </LawhiText>
    </View>
  );
}

/** Text tabs with a sliding hairline underline. */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const [x] = useState(() => new Animated.Value(0));
  const [w] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  const current = layouts[value];

  useEffect(() => {
    if (!current) return;
    if (!placed.current) {
      x.setValue(current.x);
      w.setValue(current.width);
      placed.current = true;
      return;
    }
    const opts = { duration: motion.base, easing: motion.standard, useNativeDriver: false };
    Animated.parallel([
      Animated.timing(x, { toValue: current.x, ...opts }),
      Animated.timing(w, { toValue: current.width, ...opts }),
    ]).start();
  }, [current, x, w]);

  return (
    <View style={[styles.tabs, { borderBottomColor: theme.divider }]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <View
            key={tab.value}
            onLayout={(e) => {
              const { x: left, width } = e.nativeEvent.layout;
              setLayouts((l) =>
                l[tab.value]?.x === left && l[tab.value]?.width === width
                  ? l
                  : { ...l, [tab.value]: { x: left, width } },
              );
            }}
          >
            <Tappable
              onPress={() => onChange(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              pressedScale={0.97}
              style={styles.tab}
            >
              <LawhiText variant={selected ? 'subtitle' : 'body'} tone={selected ? 'primary' : 'muted'}>
                {tab.label}
              </LawhiText>
            </Tappable>
          </View>
        );
      })}
      {current ? (
        <Animated.View
          style={[styles.underline, { backgroundColor: theme.accent, left: x, width: w }]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

/** Ornamental opening of a surah: name in Amiri Quran inside a lawh arch. */
export function SurahOpening({
  nameAr,
  subtitle,
  basmala,
}: {
  nameAr: string;
  subtitle: string;
  basmala: string | null;
}) {
  const theme = useTheme();
  return (
    <View style={styles.opening} accessibilityRole="header">
      <View style={styles.openingArch}>
        <ArchShape width={150} height={92} stroke={theme.accent} strokeWidth={1} dome={0.42} style={StyleSheet.absoluteFill} />
        <ArabicText quran size={30} style={{ textAlign: 'center', color: theme.textPrimary, marginTop: 16 }}>
          {nameAr}
        </ArabicText>
      </View>
      <LawhiText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {subtitle}
      </LawhiText>
      {basmala ? (
        <ArabicText quran size={24} style={{ textAlign: 'center', marginTop: spacing.md }}>
          {basmala}
        </ArabicText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xl },
  tab: { paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center' },
  underline: { position: 'absolute', bottom: -1, height: 2, borderRadius: 1 },
  opening: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  openingArch: { width: 150, height: 92, alignItems: 'center', justifyContent: 'center' },
});
