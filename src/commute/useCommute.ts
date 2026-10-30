import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppActive } from '../hooks/useAppActive';
import { useSettings } from '../hooks/useSettings';
import { getApiKey } from './apiKey';
import { planCommute, scheduleForToday, sydneyTimeOn, type CommutePlan } from './engine';
import { planJourneys } from './transportApi';
import { TransportError, type CommuteSchedule, type Journey } from './types';

/** Start looking up journeys this long before the arrival deadline. */
const WINDOW_MINUTES = 180;
/** Refresh this often while a commute view is on screen inside the window. */
const REFRESH_MS = 2 * 60_000;
/** Data older than this is flagged as stale on screen. */
export const STALE_AFTER_MS = 5 * 60_000;

export interface CommuteState {
  schedule: CommuteSchedule | null;
  scheduleNote: string | null;
  /** True between (deadline − 3 h) and the deadline. */
  inWindow: boolean;
  loading: boolean;
  error: TransportError | null;
  fetchedAt: Date | null;
  stale: boolean;
  plan: CommutePlan | null;
  hasKey: boolean | null;
  refresh: () => void;
}

interface Cached {
  scheduleKey: string;
  journeys: Journey[];
  fetchedAt: Date;
}

// Kept across remounts so the last result shows immediately (marked with its time).
const cache: { current: Cached | null } = { current: null };

const keyOf = (s: CommuteSchedule, now: Date) =>
  `${s.id}|${s.origin?.id}|${s.destination?.id}|${s.arriveBy}|${s.walkFromEnd}|${s.buffer}|${now.toDateString()}`;

/**
 * Today's commute: picks the schedule, fetches journeys from Transport for NSW
 * and turns them into a recommendation. Fetches only while `active` (a commute
 * view is on screen) and the app is in the foreground, and only automatically
 * inside the commute window, to keep data use and battery low.
 */
export function useCommute(now: Date, active: boolean): CommuteState {
  const { settings } = useSettings();
  const appActive = useAppActive();
  const { schedule, note } = scheduleForToday(settings.commuteSchedules, now);
  const [journeys, setJourneys] = useState<Cached | null>(cache.current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TransportError | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const inFlight = useRef(false);

  const configured = schedule && schedule.origin && schedule.destination ? schedule : null;
  const scheduleKey = configured ? keyOf(configured, now) : '';
  const deadline = configured ? sydneyTimeOn(now, configured.arriveBy) : null;
  const inWindow =
    deadline !== null &&
    now <= deadline &&
    now.getTime() >= deadline.getTime() - WINDOW_MINUTES * 60_000;

  // The fetch reads the latest schedule through a ref so its identity stays
  // stable and the refresh interval isn't restarted on every render.
  const scheduleRef = useRef(configured);
  useEffect(() => {
    scheduleRef.current = configured;
  });

  const fetchJourneys = useCallback(async () => {
    const configured = scheduleRef.current;
    if (!configured || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const key = await getApiKey();
      setHasKey(!!key);
      const nowAt = new Date();
      const deadlineAt = sydneyTimeOn(nowAt, configured.arriveBy);
      const target = new Date(
        deadlineAt.getTime() - (configured.walkFromEnd + configured.buffer) * 60_000,
      );
      let found = await planJourneys(
        configured.origin!.id,
        configured.destination!.id,
        target,
        'arrive',
        key,
      );
      // If nothing that arrives in time can still be caught, also ask for the
      // next departures from now, so we can show the best late option.
      const plan = planCommute(configured, found, nowAt);
      if (plan.status === 'no-journeys' || plan.status === 'running-late') {
        const leaving = new Date(nowAt.getTime() + configured.walkToStart * 60_000);
        const later = await planJourneys(
          configured.origin!.id,
          configured.destination!.id,
          leaving,
          'depart',
          key,
        );
        found = [...found, ...later];
      }
      const result = {
        scheduleKey: keyOf(configured, nowAt),
        journeys: found,
        fetchedAt: new Date(),
      };
      cache.current = result;
      setJourneys(result);
      setError(null);
    } catch (e) {
      setError(e instanceof TransportError ? e : new TransportError('network', String(e)));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [setLoading, setHasKey, setJourneys, setError]);

  // Automatic refresh: only on screen, in the foreground, inside the window.
  useEffect(() => {
    if (!active || !appActive || !configured || !inWindow) return;
    const fresh =
      journeys &&
      journeys.scheduleKey === scheduleKey &&
      Date.now() - journeys.fetchedAt.getTime() < REFRESH_MS;
    const first = setTimeout(fetchJourneys, fresh ? REFRESH_MS : 0);
    const timer = setInterval(fetchJourneys, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
    // journeys deliberately omitted: refreshing must not reset the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, appActive, scheduleKey, inWindow, fetchJourneys]);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, [settings.commuteSchedules]);

  const current = journeys && journeys.scheduleKey === scheduleKey ? journeys : null;
  const plan = useMemo(
    () => (configured && current ? planCommute(configured, current.journeys, now) : null),
    [configured, current, now],
  );

  return {
    schedule,
    scheduleNote:
      configured || !schedule ? note : 'Choose where you travel from and to in Settings › Commute.',
    inWindow,
    loading,
    error,
    fetchedAt: current?.fetchedAt ?? null,
    stale: current ? now.getTime() - current.fetchedAt.getTime() > STALE_AFTER_MS : false,
    plan,
    hasKey,
    refresh: fetchJourneys,
  };
}
