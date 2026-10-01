import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useAdhkarStore } from '../../stores/adhkarStore';

/** Free counter (the Flutter app's "التسبيح" screen). Haptic pulse every 33. */
export function TasbihScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const count = useAdhkarStore((s) => s.tasbih);
  const { incrementTasbih, resetTasbih } = useAdhkarStore.getState();

  return (
    <Screen
      scroll={false}
      contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('adhkar.tasbihA11y', { count })}
        onPress={() => {
          incrementTasbih();
          const next = count + 1;
          void Haptics.impactAsync(
            next % 33 === 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
          ).catch(() => undefined);
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <AppText
          style={{
            color: theme.onPrimary,
            fontSize: 64,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}
        >
          {count}
        </AppText>
        <AppText style={{ color: theme.onPrimary }}>{t('adhkar.tapToCount')}</AppText>
      </Pressable>
      <View>
        <Button title={t('adhkar.reset')} variant="secondary" onPress={resetTasbih} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
