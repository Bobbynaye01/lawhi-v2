import { PRAYERS, type NotificationMode } from '@lawhi/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from '../../components/navigation/LawhiTabBar';
import { CountdownHero, PrayerTimeline, TIMELINE } from '../../components/prayer/PrayerParts';
import {
  Button,
  Icon,
  IconButton,
  LawhiText,
  ListRow,
  Notice,
  SectionHeader,
  Segmented,
  Surface,
  Tappable,
} from '../../components/ui';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { config } from '../../constants/config';
import { radius, spacing } from '../../constants/theme';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { getCurrentPlace } from '../../services/location';
import { syncPrayerNotifications, type SyncResult } from '../../services/prayerNotifications';
import { useLocationStore } from '../../stores/locationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatDate, useLocale } from '../../utils/localize';

export function PrayerScreen({ navigation }: TabScreenProps<'Prayer'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const place = useLocationStore((s) => s.place);
  const setPlace = useLocationStore((s) => s.setPlace);
  const method = useSettingsStore((s) => s.prayerMethod);
  const mode = useSettingsStore((s) => s.notificationMode);
  const setMode = useSettingsStore((s) => s.setNotificationMode);
  const { days, next, now } = usePrayerDays();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const locate = async () => {
    setLocating(true);
    setLocationError(null);
    const result = await getCurrentPlace();
    setLocating(false);
    if (result.status === 'ok') {
      setPlace({
        name: result.name ?? t('prayer.currentPosition'),
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'gps',
      });
    } else {
      setLocationError(
        t(result.status === 'denied' ? 'prayer.locationDenied' : 'prayer.locationUnavailable'),
      );
    }
  };

  const changeMode = async (value: NotificationMode) => {
    setMode(value);
    setSyncResult(await syncPrayerNotifications({ askPermission: value !== 'off' }));
  };

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = days?.[0];
  const isTomorrow = !!(next && today && next.at.getTime() > new Date(today.times.isha).getTime());
  // The span the progress bar measures: from the last prayer time already reached.
  const previousAt = (() => {
    if (!today || !next) return null;
    const reached = TIMELINE.map((k) => new Date(today.times[k])).filter((d) => d.getTime() <= now.getTime());
    return reached.length ? reached[reached.length - 1]! : null;
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader overline={formatDate(now, locale)} title={t('prayer.title')}>
        {place ? (
          <View style={styles.placeRow}>
            <Tappable
              onPress={() => navigation.navigate('CityPicker')}
              accessibilityRole="button"
              accessibilityLabel={`${place.name}. ${t('prayer.chooseCity')}`}
              style={[styles.placeChip, { backgroundColor: theme.surfaceSunken }]}
            >
              <Icon name="pin" size={16} color={theme.secondary} />
              <LawhiText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {place.name}
              </LawhiText>
              {place.country ? (
                <LawhiText variant="caption" tone="muted" numberOfLines={1}>
                  {place.country}
                </LawhiText>
              ) : null}
            </Tappable>
            <IconButton
              icon="navigation"
              label={t('prayer.useMyLocation')}
              onPress={() => void locate()}
              disabled={locating}
              tone="brand"
            />
          </View>
        ) : null}
      </ScreenHeader>

      <View style={styles.body}>
        {!place ? (
          <Surface variant="elevated" style={{ gap: spacing.md, borderRadius: radius.xl }}>
            <LawhiText variant="title">{t('prayer.noLocationTitle')}</LawhiText>
            <LawhiText tone="secondary">{t('prayer.noLocationMessage')}</LawhiText>
            <Button title={t('prayer.useMyLocation')} icon="navigation" loading={locating} onPress={locate} />
            <Button
              title={t('prayer.chooseCity')}
              icon="search"
              variant="secondary"
              onPress={() => navigation.navigate('CityPicker')}
            />
          </Surface>
        ) : null}
        {locationError ? <Notice tone="warning">{locationError}</Notice> : null}

        {today && next ? <CountdownHero next={next} previousAt={previousAt} isTomorrow={isTomorrow} /> : null}

        {today ? (
          <>
            <SectionHeader title={t('prayer.today')} style={{ marginTop: spacing.md }} />
            <PrayerTimeline day={today} next={next} now={now} />
            <LawhiText variant="caption" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
              {t('prayer.timezoneInfo', { timezone: timeZone })}
            </LawhiText>

            <SectionHeader title={t('prayer.calculation')} style={{ marginTop: spacing.md }} />
            <Surface padded={false} style={{ overflow: 'hidden' }}>
              <ListRow
                icon="settings"
                title={t(`prayer.methods.${method}`)}
                subtitle={t('prayer.changeMethod')}
                onPress={() => navigation.navigate('Settings')}
                chevron
              />
            </Surface>
          </>
        ) : null}

        <SectionHeader title={t('prayer.notifications')} style={{ marginTop: spacing.md }} />
        {Platform.OS !== 'web' ? (
          <>
            <Segmented
              label={t('prayer.notifications')}
              value={mode}
              onChange={changeMode}
              options={[
                { value: 'off', label: t('prayer.notificationModes.off') },
                { value: 'notification', label: t('prayer.notificationModes.notification') },
                {
                  value: 'adhan',
                  label: t('prayer.notificationModes.adhan'),
                  disabled: !config.hasAdhanSound,
                },
              ]}
            />
            {!config.hasAdhanSound ? (
              <LawhiText variant="caption" tone="muted">
                {t('prayer.adhanUnavailable')}
              </LawhiText>
            ) : null}
            <LawhiText variant="caption" tone="muted">
              {t('prayer.notificationsInfo', { prayers: PRAYERS.length })}
            </LawhiText>
            {syncResult === 'permission-denied' ? (
              <>
                <Notice tone="warning">{t('prayer.notificationsDenied')}</Notice>
                <Button
                  title={t('common.openSettings')}
                  variant="secondary"
                  onPress={() => void Linking.openSettings()}
                />
              </>
            ) : null}
            {syncResult === 'no-location' ? (
              <Notice tone="warning">{t('prayer.notificationsNeedLocation')}</Notice>
            ) : null}
            {syncResult === 'scheduled' ? (
              <Notice tone="success">{t('prayer.notificationsScheduled')}</Notice>
            ) : null}
          </>
        ) : (
          <Notice>{t('prayer.notificationsWebUnsupported')}</Notice>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  placeChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
});
