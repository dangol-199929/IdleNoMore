export interface AgendaEvent {
  /** Unique per occurrence, so recurring events don't collide. */
  key: string;
  calendarId: string;
  calendarTitle: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string | null;
  location: string | null;
  notes: string | null;
  /** Opens the event in the phone's calendar app (read-only for us). */
  open: () => Promise<unknown>;
}

export interface CalendarSummary {
  id: string;
  title: string;
  account: string;
  color: string | null;
  /** True if new events can be added to it (owned or editable). */
  writable: boolean;
  isPrimary: boolean;
}

export interface NewEvent {
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
}

export type CalendarStatus =
  | 'loading'
  /** Never asked: show the explanation and an Allow button. */
  | 'needs-permission'
  /** Denied; Android may no longer show the prompt, so offer system settings. */
  | 'denied'
  | 'ready'
  | 'error';

export type EventTiming = 'past' | 'current' | 'upcoming';
