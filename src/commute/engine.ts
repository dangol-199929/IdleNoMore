import { SYDNEY_TZ } from './transportApi';
import type { CommuteSchedule, Journey } from './types';

// Commute schedules are defined in Sydney time, whatever zone the phone is in,
// and daylight-saving changes are handled by Intl's time-zone data.

function sydneyParts(at: Date) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: weekdays.indexOf(get('weekday')),
  };
}

export function sydneyWeekday(at: Date): number {
  return sydneyParts(at).weekday;
}

/** The instant at `minutes` past midnight on the Sydney calendar day containing `at`. */
export function sydneyTimeOn(at: Date, minutes: number): Date {
  const { year, month, day } = sydneyParts(at);
  const wanted = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  // Start from the wall time read as UTC and correct by Sydney's offset at that moment;
  // a second pass settles the rare case of a daylight-saving boundary in between.
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = sydneyParts(new Date(guess));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/**
 * Every enabled schedule for today's Sydney weekday, so several people (or
 * trips) can be followed at once. If none names today, enabled default
 * schedules (no days chosen) are used instead.
 */
export function schedulesForToday(schedules: CommuteSchedule[], now: Date): CommuteSchedule[] {
  const weekday = sydneyWeekday(now);
  const enabled = schedules.filter((s) => s.enabled);
  const matching = enabled.filter((s) => s.days.includes(weekday));
  const chosen = matching.length > 0 ? matching : enabled.filter((s) => s.days.length === 0);
  return [...chosen].sort((a, b) => a.arriveBy - b.arriveBy || a.name.localeCompare(b.name));
}

export const departureOf = (j: Journey) => j.departEstimated ?? j.departPlanned;
export const arrivalOf = (j: Journey) => j.arriveEstimated ?? j.arrivePlanned;

const SERIOUS = new Set(['veryHigh', 'high']);
export const hasSeriousAlert = (j: Journey) => j.alerts.some((a) => SERIOUS.has(a.priority));

export type CommuteStatus =
  'plenty-of-time' | 'leave-soon' | 'leave-now' | 'running-late' | 'no-journeys' | 'done';

export interface CommutePlan {
  status: CommuteStatus;
  recommended: Journey | null;
  /** When to walk out of the door for the recommended journey. */
  leaveHomeAt: Date | null;
  /** Expected arrival at the workplace (journey arrival + walk at the end). */
  arriveWorkAt: Date | null;
  /** Required arrival at work, today. */
  deadline: Date;
  /** Minutes the recommended journey is expected to be late (only when running late). */
  lateByMinutes: number;
  reason: string;
  alternatives: Journey[];
}

const LEAVE_SOON_MINUTES = 15;

/**
 * Picks the journey to recommend.
 *
 * Among journeys you can still make (leave-home time not yet passed), prefer
 * those arriving by the deadline (minus your buffer); of those, take the latest
 * departure, so you don't leave earlier than needed, unless it has a serious
 * alert and a clean one exists. Ties favour fewer transfers. If nothing arrives
 * in time, recommend the earliest arrival and say how late it is likely to be.
 */
export function planCommute(
  schedule: CommuteSchedule,
  journeys: Journey[],
  now: Date,
): CommutePlan {
  const deadline = sydneyTimeOn(now, schedule.arriveBy);
  const target = new Date(deadline.getTime() - schedule.buffer * 60000);
  const leaveAt = (j: Journey) => new Date(departureOf(j).getTime() - schedule.walkToStart * 60000);
  const arriveWork = (j: Journey) =>
    new Date(arrivalOf(j).getTime() + schedule.walkFromEnd * 60000);

  if (now > deadline) {
    return {
      status: 'done',
      recommended: null,
      leaveHomeAt: null,
      arriveWorkAt: null,
      deadline,
      lateByMinutes: 0,
      reason: 'Today’s arrival time has passed.',
      alternatives: [],
    };
  }

  const catchable = journeys
    .filter((j) => leaveAt(j) >= new Date(now.getTime() - 60000))
    .sort((a, b) => departureOf(a).getTime() - departureOf(b).getTime());
  const onTime = catchable.filter((j) => arriveWork(j) <= target);

  let recommended: Journey | null = null;
  let reason = '';
  if (onTime.length > 0) {
    const clean = onTime.filter((j) => !hasSeriousAlert(j));
    const pool = clean.length > 0 ? clean : onTime;
    recommended = [...pool].sort(
      (a, b) => departureOf(b).getTime() - departureOf(a).getTime() || a.transfers - b.transfers,
    )[0];
    reason =
      clean.length > 0 && clean.length < onTime.length
        ? 'Latest option that arrives on time and avoids a reported disruption.'
        : clean.length === 0
          ? 'Arrives on time, but there is a service alert on every on-time option.'
          : 'Latest departure that still gets you there on time.';
  } else if (catchable.length > 0) {
    recommended = [...catchable].sort(
      (a, b) => arrivalOf(a).getTime() - arrivalOf(b).getTime() || a.transfers - b.transfers,
    )[0];
    reason = 'No option arrives in time; this is the earliest arrival available.';
  }

  if (!recommended) {
    return {
      status: 'no-journeys',
      recommended: null,
      leaveHomeAt: null,
      arriveWorkAt: null,
      deadline,
      lateByMinutes: 0,
      reason: 'No journeys were found that you can still catch.',
      alternatives: [],
    };
  }

  const leaveHomeAt = leaveAt(recommended);
  const arriveWorkAt = arriveWork(recommended);
  const lateBy = Math.ceil((arriveWorkAt.getTime() - deadline.getTime()) / 60000);
  const minutesToLeave = (leaveHomeAt.getTime() - now.getTime()) / 60000;
  const status: CommuteStatus =
    lateBy > 0
      ? 'running-late'
      : minutesToLeave <= 1
        ? 'leave-now'
        : minutesToLeave <= LEAVE_SOON_MINUTES
          ? 'leave-soon'
          : 'plenty-of-time';

  return {
    status,
    recommended,
    leaveHomeAt,
    arriveWorkAt,
    deadline,
    lateByMinutes: Math.max(0, lateBy),
    reason,
    alternatives: catchable.filter((j) => j !== recommended).slice(0, 4),
  };
}
