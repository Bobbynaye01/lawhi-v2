import { Ionicons } from '@expo/vector-icons';
import type { DivisionKind, SurahMeta } from '@lawhi/shared';
import { useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText, ListRow, Screen, Segmented } from '../../components/ui';
import { fonts, MIN_TOUCH, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { quranRepository } from '../../repositories/quranRepository';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

type Tab = 'surah' | 'juz' | 'hizb';

export function QuranHomeScreen({ navigation }: TabScreenProps<'Quran'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const setRiwaya = useSettingsStore((s) => s.setRiwaya);
  const [tab, setTab] = useState<Tab>('surah');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('quran.search')}
            onPress={() => navigation.navigate('QuranSearch')}
            style={styles.headerButton}
          >
            <Ionicons name="search" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('quran.bookmarks')}
            onPress={() => navigation.navigate('Bookmarks')}
            style={styles.headerButton}
          >
            <Ionicons name="bookmark-outline" size={22} color={theme.text} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, t, theme.text]);

  const surahs = quranRepository.surahs();
  const divisions = useMemo(
    () => (tab === 'surah' ? [] : quranRepository.divisionStarts(riwaya, tab as DivisionKind)),
    [riwaya, tab],
  );

  const renderSurah = ({ item }: { item: SurahMeta }) => (
    <ListRow
      onPress={() => navigation.navigate('QuranReader', { kind: 'surah', number: item.id })}
      accessibilityLabel={`${item.id}. ${localized(item, 'name', locale)}`}
      leading={<AppText variant="muted" style={styles.number}>{item.id}</AppText>}
      title={locale === 'ar' ? item.nameAr : `${item.nameTranslit} · ${localized(item, 'name', locale)}`}
      subtitle={t('quran.surahMeta', {
        count: riwaya === 'hafs' ? item.versesHafs : item.versesWarsh,
        place: t(`quran.revelation.${item.revelationPlace}`),
      })}
      trailing={locale === 'ar' ? null : <AppText style={styles.arabicName}>{item.nameAr}</AppText>}
    />
  );

  return (
    <Screen scroll={false} edges={[]}>
      <View style={styles.controls}>
        <Segmented
          label={t('quran.riwayaLabel')}
          value={riwaya}
          onChange={setRiwaya}
          options={[
            { value: 'hafs', label: t('quran.riwaya.hafs') },
            { value: 'warsh', label: t('quran.riwaya.warsh') },
          ]}
        />
        <Segmented
          label={t('quran.browseBy')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'surah', label: t('quran.surahs') },
            { value: 'juz', label: t('quran.juz') },
            { value: 'hizb', label: t('quran.hizb') },
          ]}
        />
      </View>
      {tab === 'surah' ? (
        <FlatList data={surahs} keyExtractor={(s) => String(s.id)} renderItem={renderSurah} initialNumToRender={20} />
      ) : (
        <FlatList
          data={divisions}
          keyExtractor={(d) => String(d.number)}
          renderItem={({ item }) => {
            const surah = quranRepository.surah(item.start.surah)!;
            return (
              <ListRow
                onPress={() => navigation.navigate('QuranReader', { kind: tab as DivisionKind, number: item.number })}
                leading={<AppText variant="muted" style={styles.number}>{item.number}</AppText>}
                title={t(`quran.${tab}Number`, { number: item.number })}
                subtitle={`${localized(surah, 'name', locale)} · ${t('quran.verseNumber', { number: item.start.verse })}`}
                trailing={
                  <AppText numberOfLines={1} style={[styles.arabicStart, { color: theme.textMuted }]}>
                    {item.start.text.split(' ').slice(0, 3).join(' ')}
                  </AppText>
                }
              />
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { padding: spacing.lg, gap: spacing.sm },
  number: { minWidth: 32, textAlign: 'center' },
  arabicName: { fontFamily: fonts.arabic, fontSize: 20 },
  arabicStart: { fontFamily: fonts.arabic, fontSize: 16, maxWidth: 140 },
  headerButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
