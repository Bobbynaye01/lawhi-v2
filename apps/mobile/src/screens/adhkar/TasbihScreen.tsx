import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Glow, LawhiText, ProgressRing } from '../../components/ui';
import { motion, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useAdhkarStore } from '../../stores/adhkarStore';

const ROUND = 33;

/** Free counter (the Flutter app's "التسبيح" screen). Stronger haptic every 33. */
export function TasbihScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const count = useAdhkarStore((s) => s.tasbih);
  const { incrementTasbih, resetTasbih } = useAdhkarStore.getState();
  const [pulse] = useState(() => new Animated.Value(1));
  const size = Math.min(width - spacing.xxl * 2, 300);
  const inRound = count % ROUND;
  const round = Math.floor(count / ROUND) + 1;

  const tap = () => {
    incrementTasbih();
    const next = count + 1;
    pulse.setValue(0.96);
    Animated.spring(pulse, { toValue: 1, ...motion.spring, useNativeDriver: motion.native }).start();
    void Haptics.impactAsync(
      next % ROUND === 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => undefined);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingBottom: insets.bottom + spacing.xl }]}>
      <Pressable
        onPress={tap}
        accessibilityRole="button"
        accessibilityLabel={t('adhkar.tasbihA11y', { count })}
        style={styles.stage}
      >
        <Glow width={size * 1.4} height={size * 1.4} color={theme.glow} opacity={0.16} style={{ alignSelf: 'center' }} />
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <ProgressRing value={inRound / ROUND} size={size} stroke={4} color={theme.accent}>
            <View style={[styles.core, { width: size - 36, height: size - 36, backgroundColor: theme.primaryContainer }]}>
              <LawhiText
                variant="numeralLarge"
                style={{ fontSize: size * 0.26, lineHeight: size * 0.32, color: theme.onPrimaryContainer }}
              >
                {count}
              </LawhiText>
              <LawhiText variant="caption" style={{ color: theme.onPrimaryContainer, opacity: 0.75 }}>
                {t('adhkar.tapToCount')}
              </LawhiText>
            </View>
          </ProgressRing>
        </Animated.View>
        <LawhiText variant="caption" tone="muted">
          {t('adhkar.cycle', { n: round })}
        </LawhiText>
      </Pressable>
      <Button title={t('adhkar.reset')} icon="reset" variant="ghost" onPress={resetTasbih} style={{ alignSelf: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  stage: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  core: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
