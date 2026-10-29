export interface Reminder {
  id: number;
  title: string;
  notes: string | null;
  dueAt: Date;
  completedAt: Date | null;
  /** Id of the scheduled local notification, if one is pending. */
  notificationId: string | null;
}

export interface ReminderDraft {
  title: string;
  notes: string | null;
  dueAt: Date;
}
