import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppActive } from '../hooks/useAppActive';
import { useSettings } from '../hooks/useSettings';
import { getApiKey } from './apiKey';
import { nextCommuteDay, planCommute, sydneyTimeOn, type CommutePlan } from './engine';
import { planJourneys } from './transportApi';
import { TransportError, type CommuteSchedule, type Journey } from './types';

/** Start looking up journeys this long before the arrival deadline. */
const WINDOW_MINUTES = 180;
/** Refresh this often while a commute view is on screen inside the window. */
const REFRESH_MS = 2 * 60_000;
/** Data older than this is flagged as stale on screen. */
export const STALE_AFTER_MS = 5 * 60_000;
/** A later day's timetable is re-checked this often (it rarely changes). */
const AHEAD_REFRESH_MS = 30 * 60_000;

/** One person's (or one route's) next commute. */
export interface TripState {
  schedule: CommuteSchedule;
  /** 0 = today, 1 = tomorrow, … */
  dayOffset: number;
  /** Required arrival time on that day. */
  deadline: Date;
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
  /** Which day the trips are for: 0 = today, 1 = tomorrow, … */
  dayOffset: number;
  /** An instant inside that day, for labels. */
  day: Date;
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

const keyOf = (s: CommuteSchedule, day: Date) =>
  `${s.id}|${s.origin?.id}|${s.destination?.id}|${s.arriveBy}|${s.walkFromEnd}|${s.buffer}|${day.toDateString()}`;

const isConfigured = (s: CommuteSchedule) => !!(s.origin && s.destination);

function inWindowAt(s: CommuteSchedule, now: Date, day: Date = now) {
  const deadline = sydneyTimeOn(day, s.arriveBy);
  return now <= deadline && now.getTime() >= deadline.getTime() - WINDOW_MINUTES * 60_000;
}

/** Identity of a journey by its first service: same train, same departure. */
function serviceKey(j: Journey): string {
  const leg = j.legs.find((l) => !l.isWalk) ?? j.legs[0];
  return `${leg.line ?? leg.modeName}|${leg.from}|${leg.departPlanned.getTime()}`;
}

/**
 * The planner often returns the same first train several times with different
 * onward routings. Keep one per service: fewest changes, then earliest arrival.
 */
function dedupe(journeys: Journey[]): Journey[] {
  const best = new Map<string, Journey>();
  for (const j of journeys) {
    const key = serviceKey(j);
    const current = best.get(key);
    const arrive = (x: Journey) => (x.arriveEstimated ?? x.arrivePlanned).getTime();
    if (
      !current ||
      j.transfers < current.transfers ||
      (j.transfers === current.transfers && arrive(j) < arrive(current))
    ) {
      best.set(key, j);
    }
  }
  return [...best.values()];
}

async function fetchFor(
  schedule: CommuteSchedule,
  day: Date,
  ahead: boolean,
  key: string | null,
): Promise<Journey[]> {
  const nowAt = new Date();
  const deadline = sydneyTimeOn(day, schedule.arriveBy);
  const target = new Date(deadline.getTime() - (schedule.walkFromEnd + schedule.buffer) * 60_000);
  const leaving = new Date(nowAt.getTime() + schedule.walkToStart * 60_000);
  const origin = schedule.origin!.id;
  const destination = schedule.destination!.id;
  // For a later day only the timetable matters: what arrives by the deadline.
  if (ahead) return dedupe(await planJourneys(origin, destination, target, 'arrive', key));
  // Two questions, like a departure board plus a planner: "what gets me there
  // by my deadline?" and "what are the next departures from now?".
  const [arriving, departing] = await Promise.all([
    planJourneys(origin, destination, target, 'arrive', key),
    planJourneys(origin, destination, leaving, 'depart', key),
  ]);
  return dedupe([...arriving, ...departing]);
}

type Scope = 'window' | 'ahead' | 'all';

/**
 * The next commutes: today's schedules until their arrival time passes, then
 * the next day's (usually tomorrow), each with journeys from Transport for NSW
 * turned into a recommendation. Fetches only while `active` (a commute view is
 * on screen) and in the foreground. Today's trips refresh inside their commute
 * window; a later day's timetable is checked now and then.
 */
export function useCommute(now: Date, active: boolean): CommuteState {
  const { settings } = useSettings();
  const appActive = useAppActive();
  const next = nextCommuteDay(settings.commuteSchedules, now);
  const today = next.schedules;
  const ahead = next.offset > 0;
  const [results, setResults] = useState<Map<string, Result>>(() => new Map(cache));
  const [loading, setLoading] = useState<Set<string>>(() => new Set());
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const inFlight = useRef(new Set<string>());

  const keys = today.map((s) => keyOf(s, next.day));
  const windowKeys = ahead
    ? []
    : today.filter((s) => isConfigured(s) && inWindowAt(s, now)).map((s) => keyOf(s, next.day));
  const windowSignature = windowKeys.join(',');
  const aheadSignature = ahead
    ? today
        .filter(isConfigured)
        .map((s) => keyOf(s, next.day))
        .join(',')
    : '';

  // The fetch reads the latest schedules through a ref so its identity stays
  // stable and the refresh interval isn't restarted on every render.
  const schedulesRef = useRef(settings.commuteSchedules);
  useEffect(() => {
    schedulesRef.current = settings.commuteSchedules;
  });

  const fetchTrips = useCallback(
    async (scope: Scope) => {
      const key = await getApiKey();
      setHasKey(!!key);
      const nowAt = new Date();
      const { schedules, day, offset } = nextCommuteDay(schedulesRef.current, nowAt);
      const isAhead = offset > 0;
      const targets = schedules.filter((s) => {
        if (!isConfigured(s)) return false;
        if (scope === 'window') return !isAhead && inWindowAt(s, nowAt);
        if (scope === 'ahead') {
          const fetched = cache.get(keyOf(s, day))?.fetchedAt.getTime() ?? 0;
          return isAhead && nowAt.getTime() - fetched >= AHEAD_REFRESH_MS;
        }
        return true;
      });
      await Promise.all(
        targets.map(async (s) => {
          const k = keyOf(s, day);
          if (inFlight.current.has(k)) return;
          inFlight.current.add(k);
          setLoading((prev) => new Set(prev).add(k));
          let result: Result;
          try {
            result = {
              journeys: await fetchFor(s, day, isAhead, key),
              fetchedAt: new Date(),
              error: null,
            };
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
    const first = setTimeout(() => fetchTrips('window'), fresh ? REFRESH_MS : 0);
    const timer = setInterval(() => fetchTrips('window'), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, appActive, windowSignature, fetchTrips]);

  // A later day: fetch its timetable once, then re-check occasionally (only
  // trips without a recent answer are fetched, so this is cheap to call).
  useEffect(() => {
    if (!active || !appActive || aheadSignature === '') return;
    const first = setTimeout(() => fetchTrips('ahead'), 0);
    const timer = setInterval(() => fetchTrips('ahead'), AHEAD_REFRESH_MS / 3);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, appActive, aheadSignature, fetchTrips]);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, [settings.commuteSchedules]);

  // Recomputed each render: a handful of journeys, so cheaper than memoising.
  const trips = today.map((schedule, i): TripState => {
    const result = results.get(keys[i]);
    const hasData = result && result.fetchedAt.getTime() > 0;
    return {
      schedule,
      dayOffset: next.offset,
      deadline: sydneyTimeOn(next.day, schedule.arriveBy),
      configured: isConfigured(schedule),
      inWindow: !ahead && isConfigured(schedule) && inWindowAt(schedule, now),
      loading: loading.has(keys[i]),
      error: result?.error ?? null,
      fetchedAt: hasData ? result.fetchedAt : null,
      // A later day's timetable isn't expected to change minute by minute.
      stale:
        hasData && !ahead ? now.getTime() - result.fetchedAt.getTime() > STALE_AFTER_MS : false,
      plan: hasData ? planCommute(schedule, result.journeys, now, next.day) : null,
    };
  });

  return {
    trips,
    anyInWindow: windowKeys.length > 0,
    dayOffset: next.offset,
    day: next.day,
    hasKey,
    hasSchedules: settings.commuteSchedules.length > 0,
    refresh: () => fetchTrips('all'),
  };
}
