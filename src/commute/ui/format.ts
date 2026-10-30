import type { CommutePlan } from '../engine';
import type { Journey, Leg } from '../types';

export function minutesUntil(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

/** "Leave in 12 min", "Leave now", … for the recommended journey. */
export function leaveLabel(plan: CommutePlan, now: Date): string {
  if (!plan.leaveHomeAt) return '';
  const minutes = minutesUntil(plan.leaveHomeAt, now);
  if (plan.status === 'running-late') {
    return minutes <= 0 ? 'Leave now' : `Leave in ${minutes} min`;
  }
  if (minutes <= 0) return 'Leave now';
  if (minutes < 60) return `Leave in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Leave in ${h} h${m ? ` ${m} min` : ''}`;
}

/** The first public-transport leg, which is what people mean by "my train". */
export function mainLeg(journey: Journey): Leg | null {
  return journey.legs.find((l) => !l.isWalk) ?? null;
}

export function legLabel(leg: Leg): string {
  const what = leg.line ? `${leg.line}` : leg.modeName;
  return leg.towards ? `${what} to ${leg.towards.split(' via ')[0]}` : what;
}

/** Minutes a leg is running late (+) or early (−); null without real-time data. */
export function delayMinutes(leg: Leg): number | null {
  if (!leg.departEstimated) return null;
  return Math.round((leg.departEstimated.getTime() - leg.departPlanned.getTime()) / 60000);
}
