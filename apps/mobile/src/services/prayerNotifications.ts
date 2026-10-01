import {
  diffSchedule,
  localDateString,
  planPrayerNotifications,
  type NotificationMode,
} from '@lawhi/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { config } from '../constants/config';
import i18n from '../i18n';
import { useLocationStore } from '../stores/locationStore';
import { useSettingsStore } from '../stores/settingsStore';

const CHANNEL_SILENT_SOUND = 'prayer-default';
const CHANNEL_ADHAN = 'prayer-adhan';
const PRAYER_PREFIX = 'prayer:';

export type SyncResult = 'scheduled' | 'disabled' | 'no-location' | 'permission-denied' | 'unsupported';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_SILENT_SOUND, {
    name: i18n.t('notifications.channelDefault'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  if (config.hasAdhanSound) {
    // Android channels keep their sound forever: the adhan gets its own channel.
    await Notifications.setNotificationChannelAsync(CHANNEL_ADHAN, {
      name: i18n.t('notifications.channelAdhan'),
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'adhan.wav',
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

/** Without a bundled, legally obtained adhan file, "adhan" falls back to the system sound. */
export function effectiveMode(mode: NotificationMode): NotificationMode {
  return mode === 'adhan' && !config.hasAdhanSound ? 'notification' : mode;
}

/**
 * Brings scheduled prayer notifications in line with the current settings and
 * place. Safe to call often: only differences are applied.
 */
export async function syncPrayerNotifications(options: { askPermission?: boolean } = {}): Promise<SyncResult> {
  if (Platform.OS === 'web') return 'unsupported';

  const { prayerMethod, madhab, notificationMode } = useSettingsStore.getState();
  const place = useLocationStore.getState().place;
  const mode = effectiveMode(notificationMode);

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.map((n) => n.identifier).filter((id) => id.startsWith(PRAYER_PREFIX));

  if (mode === 'off' || !place) {
    await Promise.all(existing.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    return mode === 'off' ? 'disabled' : 'no-location';
  }

  const permitted = options.askPermission
    ? await requestNotificationPermission()
    : (await Notifications.getPermissionsAsync()).granted;
  if (!permitted) return 'permission-denied';

  await ensureChannels();
  const now = new Date();
  const plan = planPrayerNotifications({
    latitude: place.latitude,
    longitude: place.longitude,
    method: prayerMethod,
    madhab,
    mode,
    today: localDateString(now),
    now,
  });
  const { toCancel, toSchedule } = diffSchedule(existing, plan);

  await Promise.all(toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const item of toSchedule) {
    const prayerName = i18n.t(`prayer.names.${item.prayer}`);
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: i18n.t('notifications.prayerTitle', { prayer: prayerName }),
        body: i18n.t('notifications.prayerBody', { place: place.name }),
        sound: mode === 'adhan' ? 'adhan.wav' : 'default',
        data: { kind: 'prayer', prayer: item.prayer },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.fireAt,
        channelId: mode === 'adhan' ? CHANNEL_ADHAN : CHANNEL_SILENT_SOUND,
      },
    });
  }
  return 'scheduled';
}
