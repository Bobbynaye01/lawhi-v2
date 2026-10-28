import { localDateString } from '@lawhi/shared';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DhikrCounter } from '../../components/adhkar/DhikrCounter';
import { ArabicText, IconButton, LawhiText, MessageState, ProgressBar } from '../../components/ui';
import { spacing } from '../../constants/theme';
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
  const insets = useSafeAreaInsets();
  const fontScale = useSettingsStore((s) => s.quranFontScale);
  const category = contentRepository.category(route.params.id);
  const counts = useAdhkarStore((s) => s.counts);
  const day = useAdhkarStore((s) => s.day);
  const favorites = useAdhkarStore((s) => s.favorites);
  const { increment, resetCategory, toggleFavorite } = useAdhkarStore.getState();

  useLayoutEffect(() => {
    if (!category) return;
    navigation.setOptions({
      title: locale === 'ar' ? category.titleAr : localized(category, 'title', locale),
      headerRight: () => (
        <IconButton
          icon="reset"
          label={t('adhkar.reset')}
          onPress={() => resetCategory(category.items.map((d) => d.id))}
        />
      ),
    });
  }, [navigation, category, locale, t, resetCategory]);

  if (!category) return <MessageState title={t('errors.not_found')} />;

  const isToday = day === localDateString(new Date());
  const countOf = (id: string) => (isToday ? (counts[id] ?? 0) : 0);
  const done = category.items.filter((d) => countOf(d.id) >= d.repetitions).length;
  const total = category.items.length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.progress}>
        <LawhiText variant="caption" tone="secondary" accessibilityLiveRegion="polite">
          {t('adhkar.progress', { done, total })}
        </LawhiText>
        <ProgressBar value={total ? done / total : 0} color={done === total ? theme.success : theme.accent} height={3} />
      </View>
      <FlatList
        data={category.items}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.divider }]} />
        )}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const count = countOf(item.id);
          const complete = count >= item.repetitions;
          const favorite = favorites.includes(item.id);
          const translation =
            locale === 'fr' ? item.translationFr : locale === 'en' ? item.translationEn : null;
          return (
            <View style={[styles.item, complete && { opacity: 0.72 }]}>
              <View style={styles.meta}>
                <LawhiText variant="overline" tone="muted">
                  {index + 1} / {total}
                  {item.repetitions > 1 ? `  ·  × ${item.repetitions}` : ''}
                </LawhiText>
                <IconButton
                  icon="star"
                  filled={favorite}
                  tone={favorite ? 'accent' : 'default'}
                  size={18}
                  label={favorite ? t('adhkar.removeFavorite') : t('adhkar.addFavorite')}
                  onPress={() => toggleFavorite(item.id)}
                />
              </View>
              {item.title ? <LawhiText variant="title">{item.title}</LawhiText> : null}
              <ArabicText size={22 * fontScale}>{item.arabicText}</ArabicText>
              {translation ? <LawhiText tone="secondary">{translation}</LawhiText> : null}
              {item.virtue ? (
                <View style={[styles.virtue, { borderColor: theme.accent }]}>
                  <LawhiText variant="body" tone="secondary">
                    {item.virtue}
                  </LawhiText>
                </View>
              ) : null}
              <View style={styles.footer}>
                <LawhiText variant="caption" tone="muted" style={{ flex: 1 }}>
                  {t('adhkar.source', { source: item.source })}
                </LawhiText>
                <DhikrCounter
                  count={count}
                  total={item.repetitions}
                  onIncrement={() => increment(item.id, item.repetitions)}
                  accessibilityLabel={t('adhkar.counterA11y', { count, total: item.repetitions })}
                />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -spacing.sm },
  virtue: { borderStartWidth: 2, paddingStart: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.lg },
});
