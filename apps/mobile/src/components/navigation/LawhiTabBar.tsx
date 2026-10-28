import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, radius, spacing } from '../../constants/theme';
import { useIsDark, useTheme } from '../../hooks/useTheme';
import { ArchShape } from '../ui/Arch';
import { Icon, type IconName } from '../ui/Icon';
import { LawhiText } from '../ui/Text';

const ICONS: Record<string, IconName> = {
  Home: 'home',
  Quran: 'book',
  Prayer: 'clock',
  Qibla: 'kaaba',
  Settings: 'settings',
};

const INDICATOR_W = 46;
const INDICATOR_H = 34;

/**
 * Floating capsule navigation. A small lawh-shaped arch glides behind the
 * active tab; icons ease between muted and ink; a light haptic on change.
 */
export function LawhiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const [centers, setCenters] = useState<Record<number, number>>({});
  const [x] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  const native = Platform.OS !== 'web';

  const activeCenter = centers[state.index];
  useEffect(() => {
    if (activeCenter === undefined) return;
    const target = activeCenter - INDICATOR_W / 2;
    if (!placed.current) {
      x.setValue(target);
      placed.current = true;
      return;
    }
    Animated.spring(x, { toValue: target, ...motion.spring, useNativeDriver: native }).start();
  }, [activeCenter, x, native]);

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            shadowOpacity: dark ? 0.5 : 0.1,
          },
        ]}
        accessibilityRole="tablist"
      >
        {activeCenter !== undefined ? (
          <Animated.View style={[styles.indicator, { transform: [{ translateX: x }] }]} pointerEvents="none">
            <ArchShape width={INDICATOR_W} height={INDICATOR_H} fill={theme.primaryContainer} dome={0.55} />
          </Animated.View>
        ) : null}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = (options?.tabBarLabel as string | undefined) ?? options?.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              void Haptics.selectionAsync().catch(() => undefined);
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onLayout={(e) => {
                const { x: left, width } = e.nativeEvent.layout;
                setCenters((c) => (c[index] === left + width / 2 ? c : { ...c, [index]: left + width / 2 }));
              }}
              style={styles.item}
            >
              <View style={styles.iconSlot}>
                <Icon
                  name={ICONS[route.name] ?? 'home'}
                  size={21}
                  strokeWidth={focused ? 1.9 : 1.6}
                  color={focused ? theme.onPrimaryContainer : theme.muted}
                />
              </View>
              <LawhiText
                variant="caption"
                numberOfLines={1}
                style={{ fontSize: 11, lineHeight: 14, color: focused ? theme.textPrimary : theme.muted }}
              >
                {label}
              </LawhiText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg },
  bar: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  indicator: { position: 'absolute', top: spacing.sm - 2, left: 0 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50 },
  iconSlot: { height: INDICATOR_H - 4, justifyContent: 'center' },
});

/** Height reserved by the floating bar, so screens can pad their content. */
export const TAB_BAR_SPACE = 96;
