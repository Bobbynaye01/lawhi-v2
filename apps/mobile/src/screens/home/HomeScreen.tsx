import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Screen } from '../../components/ui';
import { radius, spacing } from '../../constants/theme';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import type { RootStackParamList, TabScreenProps } from '../../navigation/types';
import { quranRepository } from '../../repositories/quranRepository';
import { useLocationStore } from '../../stores/locationStore';
import { useQuranStore } from '../../stores/quranStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatTime, localized, useLocale } from '../../utils/localize';

type IconName = ComponentProps<typeof Ionicons>['name'];

const shortcuts: { key: string; icon: IconName; tab?: 'Quran' | 'Prayer' | 'Qibla' | 'Adhkar'; route?: keyof RootStackParamList }[] = [
  { key: 'quran', icon: 'book-outline', tab: 'Quran' },
  { key: 'prayer', icon: 'time-outline', tab: 'Prayer' },
  { key: 'qibla', icon: 'compass-outline', tab: 'Qibla' },
  { key: 'adhkar', icon: 'sparkles-outline', tab: 'Adhkar' },
  { key: 'library', icon: 'library-outline', route: 'Library' },
  { key: 'donations', icon: 'heart-outline', route: 'Donations' },
];

export function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const place = useLocationStore((s) => s.place);
  const riwaya = useSettingsStore((s) => s.riwaya);
  const lastRead = useQuranStore((s) => s.lastRead[riwaya]);
  const { next, now } = usePrayerDays();

  const minutesLeft = next ? Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60000)) : 0;

  return (
    <Screen edges={[]}>
      <Card style={{ backgroundColor: theme.primary, borderColor: theme.primary }}>
        <AppText variant="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>
          {t('home.nextPrayer')}
        </AppText>
        {place && next ? (
          <>
            <AppText variant="title" style={{ color: theme.onPrimary }}>
              {t(`prayer.names.${next.prayer}`)} · {formatTime(next.at, locale)}
            </AppText>
            <AppText style={{ color: theme.onPrimary, opacity: 0.9 }}>
              {t('home.inDuration', {
                hours: Math.floor(minutesLeft / 60),
                minutes: minutesLeft % 60,
              })}{' '}
              · {place.name}
            </AppText>
          </>
        ) : (
          <>
            <AppText style={{ color: theme.onPrimary }}>{t('home.setLocation')}</AppText>
            <Button
              title={t('prayer.chooseLocation')}
              variant="secondary"
              onPress={() => navigation.navigate('Prayer')}
              style={{ backgroundColor: theme.onPrimary, borderColor: theme.onPrimary }}
            />
          </>
        )}
      </Card>

      {lastRead ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('QuranReader', { kind: 'surah', number: lastRead.surah, verse: lastRead.verse })
          }
        >
          <Card>
            <AppText variant="small">{t('quran.continueReading')}</AppText>
            <AppText variant="heading">
              {localized(quranRepository.surah(lastRead.surah)!, 'name', locale)} ·{' '}
              {t('quran.verseNumber', { number: lastRead.verse })}
            </AppText>
            <AppText variant="small">{t(`quran.riwaya.${riwaya}`)}</AppText>
          </Card>
        </Pressable>
      ) : null}

      <View style={styles.grid}>
        {shortcuts.map((s) => (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={t(`home.shortcuts.${s.key}`)}
            onPress={() => (s.tab ? navigation.navigate(s.tab) : s.route && navigation.navigate(s.route as never))}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name={s.icon} size={30} color={theme.primary} />
            <AppText style={{ marginTop: spacing.sm, textAlign: 'center' }}>{t(`home.shortcuts.${s.key}`)}</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
});
