import { Ionicons } from '@expo/vector-icons';
import { localDateString } from '@lawhi/shared';
import * as Haptics from 'expo-haptics';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, MessageState, Screen } from '../../components/ui';
import { fonts, MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { useAdhkarStore } from '../../stores/adhkarStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

export function AdhkarCategoryScreen({ route, navigation }: RootScreenProps<'AdhkarCategory'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const fontScale = useSettingsStore((s) => s.quranFontScale);
  const category = contentRepository.category(route.params.id);
  const counts = useAdhkarStore((s) => s.counts);
  const day = useAdhkarStore((s) => s.day);
  const favorites = useAdhkarStore((s) => s.favorites);
  const { increment, resetCategory, toggleFavorite } = useAdhkarStore.getState();

  useLayoutEffect(() => {
    if (category)
      navigation.setOptions({
        title: locale === 'ar' ? category.titleAr : localized(category, 'title', locale),
      });
  }, [navigation, category, locale]);

  if (!category) return <MessageState title={t('errors.not_found')} />;

  const isToday = day === localDateString(new Date());
  const countOf = (id: string) => (isToday ? (counts[id] ?? 0) : 0);
  const done = category.items.filter((d) => countOf(d.id) >= d.repetitions).length;

  return (
    <Screen scroll={false}>
      <View style={styles.progress}>
        <AppText accessibilityLiveRegion="polite">
          {t('adhkar.progress', { done, total: category.items.length })}
        </AppText>
        <Button
          title={t('adhkar.reset')}
          variant="secondary"
          onPress={() => resetCategory(category.items.map((d) => d.id))}
        />
      </View>
      <FlatList
        data={category.items}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => {
          const count = countOf(item.id);
          const complete = count >= item.repetitions;
          const favorite = favorites.includes(item.id);
          const translation =
            locale === 'fr' ? item.translationFr : locale === 'en' ? item.translationEn : null;
          return (
            <Card style={complete ? { borderColor: theme.success } : undefined}>
              {item.title ? <AppText variant="heading">{item.title}</AppText> : null}
              <AppText
                style={[
                  styles.arabic,
                  { color: theme.quranText, fontSize: 22 * fontScale, lineHeight: 42 * fontScale },
                ]}
              >
                {item.arabicText}
              </AppText>
              {translation ? <AppText>{translation}</AppText> : null}
              {item.virtue ? <AppText variant="muted">{item.virtue}</AppText> : null}
              <AppText variant="small">{t('adhkar.source', { source: item.source })}</AppText>
              <View style={styles.footer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    favorite ? t('adhkar.removeFavorite') : t('adhkar.addFavorite')
                  }
                  onPress={() => toggleFavorite(item.id)}
                  style={styles.icon}
                >
                  <Ionicons
                    name={favorite ? 'star' : 'star-outline'}
                    size={22}
                    color={theme.accent}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('adhkar.counterA11y', { count, total: item.repetitions })}
                  accessibilityState={{ disabled: complete }}
                  disabled={complete}
                  onPress={() => {
                    const next = increment(item.id, item.repetitions);
                    void Haptics.impactAsync(
                      next >= item.repetitions
                        ? Haptics.ImpactFeedbackStyle.Heavy
                        : Haptics.ImpactFeedbackStyle.Light,
                    ).catch(() => undefined);
                  }}
                  style={[
                    styles.counter,
                    { backgroundColor: complete ? theme.success : theme.primary },
                  ]}
                >
                  <AppText style={{ color: theme.onPrimary, fontWeight: '700', fontSize: 18 }}>
                    {complete ? '✓' : `${count} / ${item.repetitions}`}
                  </AppText>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  arabic: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  icon: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    minWidth: 110,
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
