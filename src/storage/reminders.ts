import type { Reminder, ReminderDraft } from '../types/reminder';
import { getDatabase } from './database';

interface ReminderRow {
  id: number;
  title: string;
  notes: string | null;
  due_at: number;
  completed_at: number | null;
  notification_id: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toReminder(row: ReminderRow): Reminder | null {
  if (typeof row.id !== 'number' || typeof row.title !== 'string' || !Number.isFinite(row.due_at)) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    notes: row.notes || null,
    dueAt: new Date(row.due_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    notificationId: row.notification_id || null,
  };
}

/**
 * All open reminders (oldest due first), followed by those completed in the
 * last day so a mistaken tick can be undone. Older completed ones are kept in
 * the database but not shown.
 */
export async function listReminders(now: Date = new Date()): Promise<Reminder[]> {
  const rows = await getDatabase().getAllAsync<ReminderRow>(
    `SELECT id, title, notes, due_at, completed_at, notification_id
       FROM reminders
      WHERE completed_at IS NULL OR completed_at >= ?
      ORDER BY completed_at IS NOT NULL, due_at`,
    now.getTime() - DAY_MS,
  );
  return rows.map(toReminder).filter((r): r is Reminder => r !== null);
}

export async function createReminder(draft: ReminderDraft): Promise<number> {
  const result = await getDatabase().runAsync(
    'INSERT INTO reminders (title, notes, due_at, created_at) VALUES (?, ?, ?, ?)',
    draft.title,
    draft.notes,
    draft.dueAt.getTime(),
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function updateReminder(id: number, draft: ReminderDraft): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE reminders SET title = ?, notes = ?, due_at = ? WHERE id = ?',
    draft.title,
    draft.notes,
    draft.dueAt.getTime(),
    id,
  );
}

export async function setReminderCompleted(id: number, completed: boolean): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE reminders SET completed_at = ? WHERE id = ?',
    completed ? Date.now() : null,
    id,
  );
}

export async function setReminderNotification(id: number, notificationId: string | null) {
  await getDatabase().runAsync(
    'UPDATE reminders SET notification_id = ? WHERE id = ?',
    notificationId,
    id,
  );
}

export async function deleteReminder(id: number): Promise<void> {
  await getDatabase().runAsync('DELETE FROM reminders WHERE id = ?', id);
}
