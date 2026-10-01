import { normalizeArabicForSearch } from '@lawhi/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, TextInput, View } from 'react-native';
import { AppText, ListRow, Screen } from '../../components/ui';
import { fonts, MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { contentRepository, type Dhikr, type DhikrCategory } from '../../repositories/contentRepository';
import { useAdhkarStore } from '../../stores/adhkarStore';
import { localized, useLocale } from '../../utils/localize';

type Row =
  | { kind: 'category'; category: DhikrCategory }
  | { kind: 'favorite'; dhikr: Dhikr; categoryId: string }
  | { kind: 'tasbih' };

interface Section {
  key: string;
  title: string;
  data: Row[];
}

export function AdhkarHomeScreen({ navigation }: TabScreenProps<'Adhkar'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const favorites = useAdhkarStore((s) => s.favorites);
  const [query, setQuery] = useState('');

  const all = contentRepository.categories();
  const matches = useMemo(() => {
    const needle = normalizeArabicForSearch(query);
    if (needle.length < 2) return null;
    return all.flatMap((c) =>
      c.items
        .filter((d) => normalizeArabicForSearch(`${d.title ?? ''} ${d.arabicText}`).includes(needle))
        .map((d) => ({ dhikr: d, categoryId: c.id })),
    );
  }, [all, query]);

  const favoriteItems = all.flatMap((c) =>
    c.items.filter((d) => favorites.includes(d.id)).map((d) => ({ dhikr: d, categoryId: c.id })),
  );

  const preview = (d: Dhikr) => (d.title ?? d.arabicText).split(/\s+/).slice(0, 8).join(' ');

  return (
    <Screen scroll={false} edges={[]}>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('adhkar.searchPlaceholder')}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={t('adhkar.search')}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
      </View>
      {matches ? (
        <SectionList
          sections={[{ title: t('adhkar.results', { count: matches.length }), data: matches }]}
          keyExtractor={(m) => m.dhikr.id}
          renderSectionHeader={({ section }) => <AppText variant="small" style={styles.section}>{section.title}</AppText>}
          renderItem={({ item }) => (
            <ListRow
              title={preview(item.dhikr)}
              subtitle={item.dhikr.source}
              onPress={() => navigation.navigate('AdhkarCategory', { id: item.categoryId })}
            />
          )}
        />
      ) : (
        <SectionList<Row, Section>
          sections={[
            ...(favoriteItems.length > 0
              ? [{ key: 'favorites', title: t('adhkar.favorites'), data: favoriteItems.map((f): Row => ({ kind: 'favorite', ...f })) }]
              : []),
            {
              key: 'adhkar',
              title: t('adhkar.adhkar'),
              data: contentRepository.categories('adhkar').map((c): Row => ({ kind: 'category', category: c })),
            },
            {
              key: 'dua',
              title: t('adhkar.duas'),
              data: contentRepository.categories('dua').map((c): Row => ({ kind: 'category', category: c })),
            },
            { key: 'tools', title: t('adhkar.tools'), data: [{ kind: 'tasbih' }] },
          ]}
          keyExtractor={(item, i) =>
            item.kind === 'category' ? item.category.id : item.kind === 'favorite' ? `fav-${item.dhikr.id}` : `tool-${i}`
          }
          renderSectionHeader={({ section }) => (
            <AppText variant="heading" accessibilityRole="header" style={styles.section}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => {
            if (item.kind === 'category') {
              return (
                <ListRow
                  title={locale === 'ar' ? item.category.titleAr : localized(item.category, 'title', locale)}
                  subtitle={t('adhkar.itemsCount', { count: item.category.items.length })}
                  trailing={locale === 'ar' ? null : <AppText style={styles.arabic}>{item.category.titleAr}</AppText>}
                  onPress={() => navigation.navigate('AdhkarCategory', { id: item.category.id })}
                />
              );
            }
            if (item.kind === 'favorite') {
              return (
                <ListRow
                  title={preview(item.dhikr)}
                  subtitle={item.dhikr.source}
                  onPress={() => navigation.navigate('AdhkarCategory', { id: item.categoryId })}
                />
              );
            }
            return <ListRow title={t('adhkar.tasbih')} subtitle={t('adhkar.tasbihHint')} onPress={() => navigation.navigate('Tasbih')} />;
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: { padding: spacing.lg },
  input: { minHeight: MIN_TOUCH, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 17 },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  arabic: { fontFamily: fonts.arabic, fontSize: 18 },
});
