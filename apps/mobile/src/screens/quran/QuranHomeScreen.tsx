import type { DivisionKind, SurahMeta, Verse } from '@lawhi/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from '../../components/navigation/LawhiTabBar';
import { ArchNumber, UnderlineTabs } from '../../components/quran/QuranParts';
import { ArabicText, Icon, IconButton, LawhiText, Segmented, Tappable } from '../../components/ui';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { quranRepository } from '../../repositories/quranRepository';
import { useQuranStore } from '../../stores/quranStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

type Tab = 'surah' | 'juz' | 'hizb';

export function QuranHomeScreen({ navigation }: TabScreenProps<'Quran'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const setRiwaya = useSettingsStore((s) => s.setRiwaya);
  const lastRead = useQuranStore((s) => s.lastRead[riwaya]);
  const [tab, setTab] = useState<Tab>('surah');

  const surahs = quranRepository.surahs();
  const divisions = useMemo(
    () => (tab === 'surah' ? [] : quranRepository.divisionStarts(riwaya, tab as DivisionKind)),
    [riwaya, tab],
  );

  const header = (
    <ScreenHeader
      overline={t('quran.overline')}
      title={t('tabs.quran')}
      actions={
        <>
          <IconButton icon="search" label={t('quran.search')} onPress={() => navigation.navigate('QuranSearch')} />
          <IconButton icon="bookmark" label={t('quran.bookmarks')} onPress={() => navigation.navigate('Bookmarks')} />
        </>
      }
    >
      <Segmented
        label={t('quran.riwayaLabel')}
        value={riwaya}
        onChange={setRiwaya}
        options={[
          { value: 'hafs', label: t('quran.riwaya.hafs') },
          { value: 'warsh', label: t('quran.riwaya.warsh') },
        ]}
      />
      {lastRead ? (
        <Tappable
          onPress={() => navigation.navigate('QuranReader', { kind: 'surah', number: lastRead.surah, verse: lastRead.verse })}
          accessibilityRole="button"
          style={[styles.resume, { backgroundColor: theme.secondaryContainer }]}
        >
          <Icon name="bookText" size={18} color={theme.secondary} />
          <LawhiText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {t('quran.continueReading')} · {localized(quranRepository.surah(lastRead.surah)!, 'name', locale)}{' '}
            {lastRead.surah}:{lastRead.verse}
          </LawhiText>
          <Icon name="chevronForward" size={18} color={theme.secondary} />
        </Tappable>
      ) : null}
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'surah', label: t('quran.surahs') },
          { value: 'juz', label: t('quran.juz') },
          { value: 'hizb', label: t('quran.hizb') },
        ]}
      />
    </ScreenHeader>
  );

  const contentStyle = { paddingBottom: TAB_BAR_SPACE + insets.bottom };

  const renderSurah = ({ item }: { item: SurahMeta }) => (
    <Tappable
      onPress={() => navigation.navigate('QuranReader', { kind: 'surah', number: item.id })}
      accessibilityRole="button"
      accessibilityLabel={`${item.id}. ${localized(item, 'name', locale)}`}
      pressedScale={0.99}
      style={[styles.row, { borderBottomColor: theme.divider }]}
    >
      <ArchNumber value={item.id} active={lastRead?.surah === item.id} />
      <View style={{ flex: 1, gap: 2 }}>
        <LawhiText variant="subtitle" numberOfLines={1}>
          {locale === 'ar' ? item.nameAr : item.nameTranslit}
        </LawhiText>
        <LawhiText variant="caption" tone="secondary" numberOfLines={1}>
          {locale === 'ar' ? '' : `${localized(item, 'name', locale)} · `}
          {t('quran.surahMeta', {
            count: riwaya === 'hafs' ? item.versesHafs : item.versesWarsh,
            place: t(`quran.revelation.${item.revelationPlace}`),
          })}
        </LawhiText>
      </View>
      {locale === 'ar' ? null : (
        <ArabicText quran size={20} style={{ lineHeight: 34, color: theme.textPrimary }}>
          {item.nameAr}
        </ArabicText>
      )}
    </Tappable>
  );

  const renderDivision = ({ item }: { item: { number: number; start: Verse } }) => {
    const surah = quranRepository.surah(item.start.surah)!;
    return (
      <Tappable
        onPress={() => navigation.navigate('QuranReader', { kind: tab as DivisionKind, number: item.number })}
        accessibilityRole="button"
        pressedScale={0.99}
        style={[styles.row, { borderBottomColor: theme.divider }]}
      >
        <ArchNumber value={item.number} />
        <View style={{ flex: 1, gap: 2 }}>
          <LawhiText variant="subtitle">{t(`quran.${tab}Number`, { number: item.number })}</LawhiText>
          <LawhiText variant="caption" tone="secondary" numberOfLines={1}>
            {localized(surah, 'name', locale)} · {t('quran.verseNumber', { number: item.start.verse })}
          </LawhiText>
        </View>
        <ArabicText quran size={17} numberOfLines={1} style={{ maxWidth: 150, lineHeight: 30, color: theme.textSecondary }}>
          {item.start.text.split(' ').slice(0, 3).join(' ')}
        </ArabicText>
      </Tappable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {tab === 'surah' ? (
        <FlatList
          data={surahs}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderSurah}
          ListHeaderComponent={header}
          contentContainerStyle={contentStyle}
          initialNumToRender={16}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={divisions}
          keyExtractor={(d) => String(d.number)}
          renderItem={renderDivision}
          ListHeaderComponent={header}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 999,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
