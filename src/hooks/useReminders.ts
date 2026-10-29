import { useCallback, useEffect, useState } from 'react';

import {
  cancelAllNotifications,
  cancelNotification,
  configureNotifications,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleReminderNotification,
  type NotificationPermission,
} from '../services/notifications';
import {
  createReminder,
  deleteReminder,
  listReminders,
  setReminderCompleted,
  setReminderNotification,
  updateReminder,
} from '../storage/reminders';
import type { Reminder, ReminderDraft } from '../types/reminder';
import { useAppActive } from './useAppActive';

export interface RemindersApi {
  status: 'loading' | 'ready' | 'error';
  reminders: Reminder[];
  error: string | null;
  notificationPermission: NotificationPermission;
  save: (draft: ReminderDraft, id?: number) => Promise<void>;
  setCompleted: (reminder: Reminder, completed: boolean) => Promise<void>;
  remove: (reminder: Reminder) => Promise<void>;
}

/** Schedules a notification for one reminder and records its id. */
async function schedule(reminder: Reminder, permission: NotificationPermission) {
  if (permission !== 'granted') return;
  const notificationId = await scheduleReminderNotification(reminder);
  await setReminderNotification(reminder.id, notificationId);
}

/**
 * Rebuilds every scheduled notification from the database, so the two can't
 * drift apart (e.g. after a crash, a restore, or an OS that dropped alarms).
 */
async function resyncNotifications(reminders: Reminder[]) {
  await cancelAllNotifications();
  for (const reminder of reminders) {
    if (!reminder.completedAt) {
      await schedule(reminder, 'granted');
    }
  }
}

export function useReminders(): RemindersApi {
  const appActive = useAppActive();
  const [status, setStatus] = useState<RemindersApi['status']>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');

  const reload = useCallback(async () => {
    const list = await listReminders();
    setReminders(list);
    setStatus('ready');
    setError(null);
    return list;
  }, []);

  // Wraps each operation so database or notification failures surface as a
  // message instead of an unhandled promise rejection.
  const run = useCallback(
    async (label: string, task: () => Promise<void>) => {
      try {
        await task();
        await reload();
      } catch (e) {
        setError(`${label} failed (${String(e)}).`);
      }
    },
    [reload],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await configureNotifications();
        const currentPermission = await getNotificationPermission();
        const list = await listReminders();
        if (currentPermission === 'granted') {
          await resyncNotifications(list);
        }
        if (cancelled) return;
        setPermission(currentPermission);
        await reload();
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(`Reminders could not be loaded (${String(e)}).`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // The user may change notification permission in Android settings while away.
  useEffect(() => {
    if (!appActive) return;
    getNotificationPermission()
      .then(setPermission)
      .catch(() => {});
  }, [appActive]);

  const ensurePermission = useCallback(async (): Promise<NotificationPermission> => {
    if (permission !== 'undetermined') return permission;
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, [permission]);

  const save = useCallback(
    (draft: ReminderDraft, id?: number) =>
      run('Saving the reminder', async () => {
        const granted = await ensurePermission();
        let reminderId = id;
        if (reminderId === undefined) {
          reminderId = await createReminder(draft);
        } else {
          const existing = reminders.find((r) => r.id === reminderId);
          await cancelNotification(existing?.notificationId ?? null);
          await updateReminder(reminderId, draft);
        }
        await schedule(
          { id: reminderId, ...draft, completedAt: null, notificationId: null },
          granted,
        );
      }),
    [ensurePermission, reminders, run],
  );

  const setCompleted = useCallback(
    (reminder: Reminder, completed: boolean) =>
      run('Updating the reminder', async () => {
        await setReminderCompleted(reminder.id, completed);
        if (completed) {
          await cancelNotification(reminder.notificationId);
          await setReminderNotification(reminder.id, null);
        } else {
          await schedule({ ...reminder, completedAt: null }, permission);
        }
      }),
    [permission, run],
  );

  const remove = useCallback(
    (reminder: Reminder) =>
      run('Deleting the reminder', async () => {
        await cancelNotification(reminder.notificationId);
        await deleteReminder(reminder.id);
      }),
    [run],
  );

  return {
    status,
    reminders,
    error,
    notificationPermission: permission,
    save,
    setCompleted,
    remove,
  };
}
