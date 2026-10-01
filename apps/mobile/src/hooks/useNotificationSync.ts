import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { syncPrayerNotifications } from '../services/prayerNotifications';
import { useLocationStore } from '../stores/locationStore';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Re-plans prayer notifications whenever something that affects them changes
 * (place, method, madhab, mode) and each time the app returns to the
 * foreground, so the 12-day window keeps sliding and the date change is handled.
 */
export function useNotificationSync() {
  const place = useLocationStore((s) => s.place);
  const method = useSettingsStore((s) => s.prayerMethod);
  const madhab = useSettingsStore((s) => s.madhab);
  const mode = useSettingsStore((s) => s.notificationMode);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void syncPrayerNotifications().catch(() => undefined);
  }, [place, method, madhab, mode]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncPrayerNotifications().catch(() => undefined);
    });
    return () => sub.remove();
  }, []);
}
