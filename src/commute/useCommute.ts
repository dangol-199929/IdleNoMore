import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppActive } from '../hooks/useAppActive';
import { useSettings } from '../hooks/useSettings';
import { getApiKey } from './apiKey';
import { planCommute, schedulesForToday, sydneyTimeOn, type CommutePlan } from './engine';
import { planJourneys } from './transportApi';
import { TransportError, type CommuteSchedule, type Journey } from './types';

/** Start looking up journeys this long before the arrival deadline. */
const WINDOW_MINUTES = 180;
/** Refresh this often while a commute view is on screen inside the window. */
const REFRESH_MS = 2 * 60_000;
/** Data older than this is flagged as stale on screen. */
export const STALE_AFTER_MS = 5 * 60_000;

/** One person's (or one route's) commute today. */
export interface TripState {
  schedule: CommuteSchedule;
  /** False when From/To haven't been chosen yet. */
  configured: boolean;
  /** True between (deadline − 3 h) and the deadline. */
  inWindow: boolean;
  loading: boolean;
  error: TransportError | null;
  fetchedAt: Date | null;
  stale: boolean;
  plan: CommutePlan | null;
}

export interface CommuteState {
  trips: TripState[];
  /** At least one trip is inside its commute window. */
  anyInWindow: boolean;
  hasKey: boolean | null;
  hasSchedules: boolean;
  refresh: () => void;
}

interface Result {
  journeys: Journey[];
  fetchedAt: Date;
  error: TransportError | null;
}

// Last results by schedule, kept across remounts so they show immediately
// (always labelled with their time).
const cache = new Map<string, Result>();

const keyOf = (s: CommuteSchedule, now: Date) =>
  `${s.id}|${s.origin?.id}|${s.destination?.id}|${s.arriveBy}|${s.walkFromEnd}|${s.buffer}|${now.toDateString()}`;

const isConfigured = (s: CommuteSchedule) => !!(s.origin && s.destination);

function inWindowAt(s: CommuteSchedule, now: Date) {
  const deadline = sydneyTimeOn(now, s.arriveBy);
  return now <= deadline && now.getTime() >= deadline.getTime() - WINDOW_MINUTES * 60_000;
}

async function fetchFor(schedule: CommuteSchedule, key: string | null): Promise<Journey[]> {
  const nowAt = new Date();
  const deadline = sydneyTimeOn(nowAt, schedule.arriveBy);
  const target = new Date(deadline.getTime() - (schedule.walkFromEnd + schedule.buffer) * 60_000);
  const origin = schedule.origin!.id;
  const destination = schedule.destination!.id;
  let found = await planJourneys(origin, destination, target, 'arrive', key);
  // If nothing that arrives in time can still be caught, also ask for the next
  // departures from now, so the best late option can be shown honestly.
  const plan = planCommute(schedule, found, nowAt);
  if (plan.status === 'no-journeys' || plan.status === 'running-late') {
    const leaving = new Date(nowAt.getTime() + schedule.walkToStart * 60_000);
    found = [...found, ...(await planJourneys(origin, destination, leaving, 'depart', key))];
  }
  return found;
}

/**
 * Today's commutes: every schedule for today, each with journeys from
 * Transport for NSW turned into a recommendation. Fetches only while `active`
 * (a commute view is on screen), in the foreground, and automatically only
 * inside each trip's commute window, to keep data use and battery low.
 */
export function useCommute(now: Date, active: boolean): CommuteState {
  const { settings } = useSettings();
  const appActive = useAppActive();
  const today = schedulesForToday(settings.commuteSchedules, now);
  const [results, setResults] = useState<Map<string, Result>>(() => new Map(cache));
  const [loading, setLoading] = useState<Set<string>>(() => new Set());
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const inFlight = useRef(new Set<string>());

  const keys = today.map((s) => keyOf(s, now));
  const windowKeys = today
    .filter((s) => isConfigured(s) && inWindowAt(s, now))
    .map((s) => keyOf(s, now));
  const windowSignature = windowKeys.join(',');

  // The fetch reads the latest schedules through a ref so its identity stays
  // stable and the refresh interval isn't restarted on every render.
  const todayRef = useRef(today);
  useEffect(() => {
    todayRef.current = today;
  });

  const fetchTrips = useCallback(
    async (onlyInWindow: boolean) => {
      const key = await getApiKey();
      setHasKey(!!key);
      const nowAt = new Date();
      const targets = todayRef.current.filter(
        (s) => isConfigured(s) && (!onlyInWindow || inWindowAt(s, nowAt)),
      );
      await Promise.all(
        targets.map(async (s) => {
          const k = keyOf(s, nowAt);
          if (inFlight.current.has(k)) return;
          inFlight.current.add(k);
          setLoading((prev) => new Set(prev).add(k));
          let result: Result;
          try {
            result = { journeys: await fetchFor(s, key), fetchedAt: new Date(), error: null };
          } catch (e) {
            const error =
              e instanceof TransportError ? e : new TransportError('network', String(e));
            // Keep the previous journeys (with their time) so stale data stays visible, marked.
            const previous = cache.get(k);
            result = previous
              ? { ...previous, error }
              : { journeys: [], fetchedAt: new Date(0), error };
          }
          cache.set(k, result);
          inFlight.current.delete(k);
          setResults(new Map(cache));
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(k);
            return next;
          });
        }),
      );
    },
    [setHasKey, setLoading, setResults],
  );

  useEffect(() => {
    if (!active || !appActive || windowSignature === '') return;
    const newest = Math.max(
      0,
      ...windowSignature.split(',').map((k) => cache.get(k)?.fetchedAt.getTime() ?? 0),
    );
    const fresh = new Date().getTime() - newest < REFRESH_MS;
    const first = setTimeout(() => fetchTrips(true), fresh ? REFRESH_MS : 0);
    const timer = setInterval(() => fetchTrips(true), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, appActive, windowSignature, fetchTrips]);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, [settings.commuteSchedules]);

  // Recomputed each render: a handful of journeys, so cheaper than memoising.
  const trips = today.map((schedule, i): TripState => {
    const result = results.get(keys[i]);
    const hasData = result && result.fetchedAt.getTime() > 0;
    return {
      schedule,
      configured: isConfigured(schedule),
      inWindow: isConfigured(schedule) && inWindowAt(schedule, now),
      loading: loading.has(keys[i]),
      error: result?.error ?? null,
      fetchedAt: hasData ? result.fetchedAt : null,
      stale: hasData ? now.getTime() - result.fetchedAt.getTime() > STALE_AFTER_MS : false,
      plan: hasData ? planCommute(schedule, result.journeys, now) : null,
    };
  });

  return {
    trips,
    anyInWindow: windowKeys.length > 0,
    hasKey,
    hasSchedules: settings.commuteSchedules.length > 0,
    refresh: () => fetchTrips(false),
  };
}
