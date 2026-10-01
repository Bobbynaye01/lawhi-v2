import { PRAYERS, type NotificationMode } from '@lawhi/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, MessageState, Notice, Screen, SectionTitle, Segmented } from '../../components/ui';
import { config } from '../../constants/config';
import { radius, spacing } from '../../constants/theme';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { getCurrentPlace } from '../../services/location';
import { syncPrayerNotifications, type SyncResult } from '../../services/prayerNotifications';
import { useLocationStore } from '../../stores/locationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatDate, formatTime, useLocale } from '../../utils/localize';

const ROWS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export function PrayerScreen({ navigation }: TabScreenProps<'Prayer'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
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
      setLocationError(t(result.status === 'denied' ? 'prayer.locationDenied' : 'prayer.locationUnavailable'));
    }
  };

  const changeMode = async (value: NotificationMode) => {
    setMode(value);
    setSyncResult(await syncPrayerNotifications({ askPermission: value !== 'off' }));
  };

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = days?.[0];

  return (
    <Screen edges={[]}>
      {place ? (
        <Card>
          <AppText variant="heading">{place.name}</AppText>
          <AppText variant="small">
            {place.country ? `${place.country} · ` : ''}
            {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
          </AppText>
          <View style={styles.actions}>
            <Button title={t('prayer.useMyLocation')} variant="secondary" loading={locating} onPress={locate} style={{ flex: 1 }} />
            <Button title={t('prayer.chooseCity')} variant="secondary" onPress={() => navigation.navigate('CityPicker')} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Card>
          <MessageState title={t('prayer.noLocationTitle')} message={t('prayer.noLocationMessage')} />
          <Button title={t('prayer.useMyLocation')} loading={locating} onPress={locate} />
          <Button title={t('prayer.chooseCity')} variant="secondary" onPress={() => navigation.navigate('CityPicker')} />
        </Card>
      )}
      {locationError ? <Notice tone="warning">{locationError}</Notice> : null}

      {today ? (
        <>
          <SectionTitle>{formatDate(now, locale)}</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {ROWS.map((key) => {
              const at = new Date(today.times[key]);
              const isNext = next?.prayer === key && next.at.getTime() === at.getTime();
              return (
                <View
                  key={key}
                  accessible
                  accessibilityLabel={`${t(`prayer.names.${key}`)} ${formatTime(at, locale)}${isNext ? `, ${t('prayer.next')}` : ''}`}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.border },
                    isNext && { backgroundColor: theme.primary },
                  ]}
                >
                  <AppText style={[styles.name, isNext && { color: theme.onPrimary, fontWeight: '700' }]}>
                    {t(`prayer.names.${key}`)}
                  </AppText>
                  <AppText style={[styles.time, isNext && { color: theme.onPrimary, fontWeight: '700' }]}>
                    {formatTime(at, locale)}
                  </AppText>
                </View>
              );
            })}
          </Card>
          <AppText variant="small">
            {t('prayer.methodInfo', { method: t(`prayer.methods.${method}`) })} · {t('prayer.timezoneInfo', { timezone: timeZone })}
          </AppText>
          <Button title={t('prayer.changeMethod')} variant="secondary" onPress={() => navigation.navigate('Settings')} />
        </>
      ) : null}

      {Platform.OS !== 'web' ? (
        <>
          <SectionTitle>{t('prayer.notifications')}</SectionTitle>
          <Segmented
            label={t('prayer.notifications')}
            value={mode}
            onChange={changeMode}
            options={[
              { value: 'off', label: t('prayer.notificationModes.off') },
              { value: 'notification', label: t('prayer.notificationModes.notification') },
              { value: 'adhan', label: t('prayer.notificationModes.adhan'), disabled: !config.hasAdhanSound },
            ]}
          />
          {!config.hasAdhanSound ? <AppText variant="small">{t('prayer.adhanUnavailable')}</AppText> : null}
          <AppText variant="small">{t('prayer.notificationsInfo', { prayers: PRAYERS.length })}</AppText>
          {syncResult === 'permission-denied' ? (
            <>
              <Notice tone="warning">{t('prayer.notificationsDenied')}</Notice>
              <Button title={t('common.openSettings')} variant="secondary" onPress={() => void Linking.openSettings()} />
            </>
          ) : null}
          {syncResult === 'no-location' ? <Notice tone="warning">{t('prayer.notificationsNeedLocation')}</Notice> : null}
          {syncResult === 'scheduled' ? <Notice tone="success">{t('prayer.notificationsScheduled')}</Notice> : null}
        </>
      ) : (
        <Notice>{t('prayer.notificationsWebUnsupported')}</Notice>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  name: { fontSize: 17 },
  time: { fontSize: 18, fontVariant: ['tabular-nums'] },
});
