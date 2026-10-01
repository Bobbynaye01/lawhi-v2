import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { syncPrayerNotifications } from './prayerNotifications';

const PRAYER_REFRESH_TASK = 'lawhi-prayer-refresh';

/**
 * Keeps the 12-day notification window sliding even if the app is not opened.
 * The OS decides the exact timing; the minimum interval is a hint (12 h).
 */
if (Platform.OS !== 'web') TaskManager.defineTask(PRAYER_REFRESH_TASK, async () => {
  try {
    await syncPrayerNotifications();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundTasks() {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (!(await TaskManager.isTaskRegisteredAsync(PRAYER_REFRESH_TASK))) {
      await BackgroundTask.registerTaskAsync(PRAYER_REFRESH_TASK, { minimumInterval: 12 * 60 });
    }
  } catch {
    // Background tasks are best effort; the schedule is also refreshed on every launch.
  }
}
