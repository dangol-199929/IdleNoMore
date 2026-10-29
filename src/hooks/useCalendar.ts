import { useCallback, useEffect, useState } from 'react';

import {
  getCalendarPermission,
  listCalendars,
  listEventsForDay,
  requestCalendarPermission,
} from '../services/calendar';
import type { AgendaEvent, CalendarStatus } from '../types/calendar';
import { useAppActive } from './useAppActive';

// The provider is local, so this is a cheap query; it picks up newly synced events.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export interface CalendarState {
  status: CalendarStatus;
  events: AgendaEvent[];
  lastRefreshed: Date | null;
  error: string | null;
  refreshing: boolean;
}

// Last result, kept across remounts (e.g. a trip to Settings) so the desk shows
// the previous agenda immediately instead of a loading state.
const lastState: { current: CalendarState | null } = { current: null };

export interface CalendarApi extends CalendarState {
  refresh: () => void;
  requestAccess: () => void;
}

/**
 * Today's events from the phone's calendar provider (Google Calendar events
 * appear here once the Google account syncs to the phone).
 *
 * Refreshes on mount, when the app returns to the foreground, when the day
 * changes, when the visible calendars change, and every 15 minutes while open.
 */
export function useCalendar(dayKey: string, hiddenCalendarIds: string[]): CalendarApi {
  const appActive = useAppActive();
  const [state, setState] = useState<CalendarState>(
    () =>
      lastState.current ?? {
        status: 'loading',
        events: [],
        lastRefreshed: null,
        error: null,
        refreshing: false,
      },
  );

  useEffect(() => {
    lastState.current = { ...state, refreshing: false };
  }, [state]);
  const hiddenKey = hiddenCalendarIds.join('|');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const permission = await getCalendarPermission();
      if (permission !== 'granted') {
        setState((s) => ({
          ...s,
          status: s.status === 'denied' ? 'denied' : 'needs-permission',
          events: [],
          refreshing: false,
        }));
        return;
      }
      const hidden = new Set(hiddenKey ? hiddenKey.split('|') : []);
      const calendars = (await listCalendars()).filter((c) => !hidden.has(c.id));
      const events = await listEventsForDay(new Date(), calendars);
      setState({
        status: 'ready',
        events,
        lastRefreshed: new Date(),
        error: null,
        refreshing: false,
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: `Calendar could not be read (${String(error)}).`,
        refreshing: false,
      }));
    }
  }, [hiddenKey]);

  useEffect(() => {
    if (!appActive) return;
    // Defer so state updates happen outside the effect body.
    const first = setTimeout(load, 0);
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [appActive, dayKey, load]);

  const requestAccess = useCallback(async () => {
    try {
      const result = await requestCalendarPermission();
      if (result === 'granted') {
        await load();
      } else {
        setState((s) => ({ ...s, status: 'denied' }));
      }
    } catch (error) {
      setState((s) => ({ ...s, status: 'error', error: String(error) }));
    }
  }, [load]);

  return {
    ...state,
    refresh: load,
    requestAccess,
  };
}
