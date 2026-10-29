import * as Calendar from 'expo-calendar';
import { PermissionsAndroid, Platform } from 'react-native';

import type { AgendaEvent, CalendarSummary, EventTiming } from '../types/calendar';

// Reading events only needs READ_CALENDAR. expo-calendar's own permission
// request also asks for WRITE_CALENDAR, which this app never uses, so on
// Android we ask for read access directly (WRITE_CALENDAR is blocked in app.json).
const READ = PermissionsAndroid.PERMISSIONS.READ_CALENDAR;

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'blocked';

export async function getCalendarPermission(): Promise<PermissionState> {
  if (Platform.OS !== 'android') {
    const { status } = await Calendar.getCalendarPermissions();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  }
  return (await PermissionsAndroid.check(READ)) ? 'granted' : 'undetermined';
}

export async function requestCalendarPermission(): Promise<PermissionState> {
  if (Platform.OS !== 'android') {
    const { status } = await Calendar.requestCalendarPermissions();
    return status === 'granted' ? 'granted' : 'denied';
  }
  const result = await PermissionsAndroid.request(READ);
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  // After repeated denials Android stops showing the prompt entirely.
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

export async function listCalendars(): Promise<CalendarSummary[]> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((c) => c.isVisible !== false)
    .map((c) => ({
      id: c.id,
      title: c.title || c.name || 'Untitled calendar',
      account: c.source?.name ?? c.ownerAccount ?? '',
      color: c.color ?? null,
    }))
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Android stores all-day events as UTC midnight to UTC midnight. Reading those
 * instants in local time shifts them by the UTC offset, so rebuild them as
 * local dates from their UTC calendar date.
 */
function allDayAsLocal(value: Date): Date {
  return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/** Events that overlap the local day containing `day`, sorted all-day first, then by start. */
export async function listEventsForDay(
  day: Date,
  calendars: CalendarSummary[],
): Promise<AgendaEvent[]> {
  if (calendars.length === 0) return [];

  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const titles = new Map(calendars.map((c) => [c.id, c.title]));
  const colors = new Map(calendars.map((c) => [c.id, c.color]));

  // Widen the query by a day on each side so all-day events stored in UTC are
  // not missed in time zones far from UTC; they are filtered precisely below.
  const raw = await Calendar.listEvents(
    calendars.map((c) => c.id),
    addDays(dayStart, -1),
    addDays(dayEnd, 1),
  );

  const events: AgendaEvent[] = [];
  for (const event of raw) {
    const rawStart = new Date(event.startDate);
    const rawEnd = new Date(event.endDate);
    if (Number.isNaN(rawStart.getTime()) || Number.isNaN(rawEnd.getTime())) continue;

    const start = event.allDay ? allDayAsLocal(rawStart) : rawStart;
    let end = event.allDay ? allDayAsLocal(rawEnd) : rawEnd;
    if (end <= start) end = event.allDay ? addDays(start, 1) : start;

    // Zero-length events (start === end) count if they start today.
    const overlapsDay = start < dayEnd && (end > dayStart || start >= dayStart);
    if (!overlapsDay) continue;

    events.push({
      key: `${event.id}:${rawStart.getTime()}`,
      calendarId: event.calendarId,
      calendarTitle: titles.get(event.calendarId) ?? '',
      title: event.title?.trim() || '(No title)',
      start,
      end,
      allDay: event.allDay,
      color: colors.get(event.calendarId) ?? null,
      location: event.location?.trim() || null,
      notes: event.notes?.trim() || null,
      open: () => event.openInCalendar(),
    });
  }

  return events.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime();
  });
}

export function eventTiming(event: AgendaEvent, now: Date): EventTiming {
  if (now < event.start) return 'upcoming';
  if (now < event.end) return 'current';
  return 'past';
}

/** The first timed event that hasn't started yet. */
export function findNextEvent(events: AgendaEvent[], now: Date): AgendaEvent | null {
  return events.find((e) => !e.allDay && e.start > now) ?? null;
}

/** Timed events in progress right now. */
export function findCurrentEvents(events: AgendaEvent[], now: Date): AgendaEvent[] {
  return events.filter((e) => !e.allDay && eventTiming(e, now) === 'current');
}
