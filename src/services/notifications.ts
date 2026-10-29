import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '../types/reminder';

const CHANNEL_ID = 'reminders';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

let configured = false;

/** Notification channel and foreground behaviour. Safe to call more than once. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  // The app is usually open on the desk, so show reminders even in the foreground.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      description: 'Your personal reminders from DeskClock',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

// Android 13+ reports 'denied' before the user has ever been asked, so only
// treat it as denied once the system will no longer show the prompt.
function toPermission({
  status,
  canAskAgain,
}: {
  status: string;
  canAskAgain: boolean;
}): NotificationPermission {
  if (status === 'granted') return 'granted';
  return canAskAgain ? 'undetermined' : 'denied';
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.requestPermissionsAsync());
}

/**
 * Schedules a one-off notification at the reminder's due time and returns its id,
 * or null when nothing should be scheduled (past, completed, or not permitted).
 *
 * The app declares SCHEDULE_EXACT_ALARM, which Android 12–13 grants automatically,
 * so reminders fire on time there. Android 14+ denies it by default; expo-notifications
 * then falls back to an inexact alarm that can arrive several minutes late. Battery
 * savers and manufacturer restrictions can delay either kind.
 */
export async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  if (reminder.completedAt || reminder.dueAt.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.notes ?? 'Reminder',
      data: { reminderId: reminder.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminder.dueAt,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already delivered or cancelled.
  }
}

/** Cancels every notification this app scheduled. Used before a full resync. */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
