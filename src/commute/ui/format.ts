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

// Sydney Trains / Metro line colours as used on TfNSW signage, so badges match
// what people see on platforms. Other modes fall back to their mode colour.
const LINE_COLOURS: Record<string, string> = {
  T1: '#F99D1C',
  T2: '#0098CD',
  T3: '#F37021',
  T4: '#005AA3',
  T5: '#C4258F',
  T6: '#7C3E21',
  T7: '#6F818E',
  T8: '#00954C',
  T9: '#D11F2F',
  M1: '#168388',
  BMT: '#F99D1C',
  CCN: '#D11F2F',
  SCO: '#005AA3',
  HUN: '#833134',
};
const MODE_COLOURS: Record<number, string> = {
  1: '#F6891F',
  2: '#168388',
  4: '#E4022D',
  5: '#00B5EF',
  7: '#742282',
  9: '#5AB031',
  11: '#00B5EF',
};

export function lineColour(leg: Leg): string {
  return (leg.line && LINE_COLOURS[leg.line]) || MODE_COLOURS[leg.modeClass] || '#8B8E94';
}

/** "Parramatta Station, Platform 1" → "1" (null when the stop name has no platform). */
export function platformOf(stopName: string): string | null {
  const match = /(?:Platform|Stand|Wharf)\s+([A-Z0-9]+)/i.exec(stopName);
  return match ? match[1] : null;
}

/** "Parramatta Station, Platform 1" → "Parramatta Station". */
export function stationOf(stopName: string): string {
  return stopName.split(',')[0].trim();
}
