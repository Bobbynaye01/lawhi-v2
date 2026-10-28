import type { Riwaya } from '@lawhi/shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AdhkarTile,
  HomeHeader,
  PrayerHero,
  PrayerHeroEmpty,
  QiblaTile,
  QuranContinueCard,
  ShortcutCard,
  VerseOfDay,
} from '../../components/home/HomeSections';
import { TAB_BAR_SPACE } from '../../components/navigation/LawhiTabBar';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeader } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { quranRepository } from '../../repositories/quranRepository';
import { useAdhkarStore } from '../../stores/adhkarStore';
import { useIntroStore } from '../../stores/introStore';
import { useLocationStore } from '../../stores/locationStore';
import { useQuranStore } from '../../stores/quranStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { adhkarMoment } from '../../utils/adhkarMoment';
import { localized, useLocale } from '../../utils/localize';

/** Deterministic verse for the day, among short verses of the current riwaya. */
function verseOfDay(riwaya: Riwaya, now: Date) {
  const candidates = quranRepository.allVerses(riwaya).filter((v) => v.text.length >= 28 && v.text.length <= 95);
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return candidates[(dayNumber * 7919) % candidates.length]!;
}

export function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const introDone = useIntroStore((s) => s.done);
  const place = useLocationStore((s) => s.place);
  const riwaya = useSettingsStore((s) => s.riwaya);
  const lastRead = useQuranStore((s) => s.lastRead[riwaya]);
  const counts = useAdhkarStore((s) => s.counts);
  const { days, next, now } = usePrayerDays();

  const moment = adhkarMoment(days, now);
  const category = contentRepository.category(moment);
  const done = category ? category.items.filter((d) => (counts[d.id] ?? 0) >= d.repetitions).length : 0;
  const dayKey = now.toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const verse = useMemo(() => verseOfDay(riwaya, now), [riwaya, dayKey]);
  const today = days?.[0];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal active={introDone}>
          <HomeHeader now={now} onSettings={() => navigation.navigate('Settings')} />
        </Reveal>

        <Reveal active={introDone} delay={90}>
          {place && today ? (
            <PrayerHero day={today} next={next} now={now} placeName={place.name} onPress={() => navigation.navigate('Prayer')} />
          ) : (
            <PrayerHeroEmpty onPress={() => navigation.navigate('Prayer')} />
          )}
        </Reveal>

        <Reveal active={introDone} delay={180}>
          <VerseOfDay
            verse={verse}
            surah={quranRepository.surah(verse.surah)!}
            onPress={() => navigation.navigate('QuranReader', { kind: 'surah', number: verse.surah, verse: verse.verse })}
          />
        </Reveal>

        <Reveal active={introDone} delay={225}>
          <SectionHeader title={t('home.quranSection')} action={t('home.allSurahs')} onAction={() => navigation.navigate('Quran')} />
          <QuranContinueCard
            riwaya={riwaya}
            lastRead={lastRead}
            onPress={() =>
              navigation.navigate('QuranReader', {
                kind: 'surah',
                number: lastRead?.surah ?? 1,
                verse: lastRead?.verse,
              })
            }
          />
        </Reveal>

        <Reveal active={introDone} delay={270} style={styles.cards}>
          <ShortcutCard
            icon="book"
            title={t('home.shortcuts.quran')}
            subtitle={t('home.quranHint', { count: 114 })}
            onPress={() => navigation.navigate('Quran')}
          />
          <ShortcutCard
            icon="library"
            title={t('home.shortcuts.library')}
            subtitle={t('home.libraryHint', { count: contentRepository.books().length })}
            onPress={() => navigation.navigate('Library')}
          />
        </Reveal>

        <Reveal active={introDone} delay={315} style={styles.tiles}>
          <QiblaTile place={place} onPress={() => navigation.navigate('Qibla')} />
          {category ? (
            <AdhkarTile
              title={localized(category, 'title', locale)}
              done={done}
              total={category.items.length}
              onPress={() => navigation.navigate('AdhkarCategory', { id: category.id })}
            />
          ) : null}
        </Reveal>

        <Reveal active={introDone} delay={360} style={styles.cards}>
          <ShortcutCard
            icon="adhkar"
            title={t('home.shortcuts.adhkar')}
            subtitle={t('home.adhkarHint')}
            onPress={() => navigation.navigate('Adhkar')}
          />
          <ShortcutCard
            icon="donate"
            title={t('home.shortcuts.donations')}
            subtitle={t('home.donationsHint')}
            onPress={() => navigation.navigate('Donations')}
          />
        </Reveal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  cards: { gap: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.md },
});
