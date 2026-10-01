import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { AppText, ListRow, MessageState, Screen } from '../../components/ui';
import { fonts, MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { quranRepository } from '../../repositories/quranRepository';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

const LIMIT = 100;

export function QuranSearchScreen({ navigation }: RootScreenProps<'QuranSearch'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);

  // Also accept "2:255" to jump straight to a verse.
  const reference = /^\s*(\d{1,3})\s*[:.]\s*(\d{1,3})\s*$/.exec(deferred);
  const results = useMemo(() => quranRepository.search(riwaya, deferred, LIMIT), [riwaya, deferred]);

  return (
    <Screen scroll={false} edges={['bottom']}>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('quran.searchPlaceholder')}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={t('quran.search')}
          autoFocus
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <AppText variant="small">{t(`quran.riwaya.${riwaya}`)}</AppText>
      </View>
      {reference ? (
        <ListRow
          title={t('quran.goToVerse', { reference: `${reference[1]}:${reference[2]}` })}
          onPress={() =>
            navigation.replace('QuranReader', {
              kind: 'surah',
              number: Number(reference[1]),
              verse: Number(reference[2]),
            })
          }
        />
      ) : null}
      {deferred.trim().length >= 2 && results.length === 0 && !reference ? (
        <MessageState title={t('quran.noResults')} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(v) => `${v.surah}:${v.verse}`}
          ListHeaderComponent={
            results.length > 0 ? (
              <AppText variant="small" style={{ paddingHorizontal: spacing.lg }}>
                {results.length === LIMIT ? t('quran.resultsLimited', { count: LIMIT }) : t('quran.resultsCount', { count: results.length })}
              </AppText>
            ) : null
          }
          renderItem={({ item }) => (
            <ListRow
              title={`${localized(quranRepository.surah(item.surah)!, 'name', locale)} ${item.surah}:${item.verse}`}
              subtitle={undefined}
              onPress={() => navigation.navigate('QuranReader', { kind: 'surah', number: item.surah, verse: item.verse })}
              trailing={
                <AppText numberOfLines={2} style={[styles.arabic, { color: theme.quranText }]}>
                  {item.text}
                </AppText>
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: { padding: spacing.lg, gap: spacing.xs },
  input: { minHeight: MIN_TOUCH, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 18 },
  arabic: { fontFamily: fonts.arabic, fontSize: 18, maxWidth: '62%', textAlign: 'right' },
});
