import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { motion } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { ProgressRing } from '../ui/Progress';
import { LawhiText } from '../ui/Text';

/**
 * Round counter: each tap fills the ring and gives a small "breath" (scale
 * pulse) with a light haptic; completion turns it into a check.
 */
export function DhikrCounter({
  count,
  total,
  onIncrement,
  accessibilityLabel,
  size = 64,
}: {
  count: number;
  total: number;
  onIncrement: () => number;
  accessibilityLabel: string;
  size?: number;
}) {
  const theme = useTheme();
  const complete = count >= total;
  const [pulse] = useState(() => new Animated.Value(1));
  const [doneScale] = useState(() => new Animated.Value(complete ? 1 : 0));

  useEffect(() => {
    Animated.spring(doneScale, {
      toValue: complete ? 1 : 0,
      ...motion.spring,
      useNativeDriver: motion.native,
    }).start();
  }, [complete, doneScale]);

  const tap = () => {
    const next = onIncrement();
    pulse.setValue(0.9);
    Animated.spring(pulse, { toValue: 1, ...motion.spring, useNativeDriver: motion.native }).start();
    void Haptics.impactAsync(
      next >= total ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => undefined);
  };

  return (
    <Pressable
      onPress={tap}
      disabled={complete}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: complete }}
      hitSlop={8}
    >
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <ProgressRing
          value={total > 0 ? count / total : 0}
          size={size}
          stroke={3}
          color={complete ? theme.success : theme.accent}
        >
          {complete ? (
            <Animated.View
              style={[styles.done, { backgroundColor: theme.success, width: size - 12, height: size - 12, transform: [{ scale: doneScale }] }]}
            >
              <Icon name="check" size={size * 0.38} color={theme.surface} strokeWidth={2.2} />
            </Animated.View>
          ) : (
            <LawhiText variant="numeral" style={{ fontSize: size * 0.26 }}>
              {total > 1 ? `${count}/${total}` : count}
            </LawhiText>
          )}
        </ProgressRing>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  done: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
