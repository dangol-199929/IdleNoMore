import { useTheme } from '../../theme';
import { arrivalOf, departureOf, hasSeriousAlert } from '../engine';
import type { CommuteSchedule, Journey } from '../types';
import { minutesUntil } from './format';

/**
 * What a journey means for you right now, as one colour you can read across
 * the room: green on time, amber leave soon, orange go now, red late, blue a
 * plan for a later day.
 */
export type Tone = 'good' | 'soon' | 'now' | 'late' | 'planned' | 'neutral';

const DARK: Record<Tone, string> = {
  good: '#3DD68C',
  soon: '#F5B83D',
  now: '#FF7A45',
  late: '#FF5A5F',
  planned: '#6AA8FF',
  neutral: '#8B8E94',
};

const LIGHT: Record<Tone, string> = {
  good: '#1E8E55',
  soon: '#B7791F',
  now: '#D3541B',
  late: '#C9343A',
  planned: '#2F6FC0',
  neutral: '#6B6E74',
};

// One colour per person, kept clear of the status colours above.
const PEOPLE = ['#B79CFF', '#2DD4BF', '#FF8FC8', '#7CC4FF', '#E8C07A'];

const alpha = (hex: string, a: number) =>
  `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;

/**
 * Status, person and tint colours for the commute views. Night themes keep
 * to their dim single colour so the screen stays dark in a bedroom.
 */
export function useCommutePalette() {
  const { colors, isLight, name } = useTheme();
  const night = name.startsWith('night-');
  const tones: Record<Tone, string> = night
    ? {
        good: colors.text,
        soon: colors.accent,
        now: colors.warning,
        late: colors.warning,
        planned: colors.muted,
        neutral: colors.muted,
      }
    : isLight
      ? LIGHT
      : DARK;
  return {
    night,
    tones,
    person: (index: number) => (night ? colors.accent : PEOPLE[index % PEOPLE.length]),
    /** A faint wash of a colour for card backgrounds. */
    tint: (hex: string, amount = 0.1) => (night ? 'transparent' : alpha(hex, amount)),
    /** Text colour that reads on a bright person or line colour. */
    onColour: night ? colors.background : '#111214',
  };
}

export interface Assessment {
  tone: Tone;
  /** When to walk out of the door. */
  leaveAt: Date;
  /** Arrival at the workplace, after the final walk. */
  arriveAt: Date;
  /** Minutes until leaving (negative once passed). */
  toLeave: number;
  /** Minutes to spare before the deadline (negative when late). */
  spare: number;
  disrupted: boolean;
}

/** How a single journey works out for this schedule. */
export function assess(
  journey: Journey,
  schedule: CommuteSchedule,
  deadline: Date,
  now: Date,
  ahead: boolean,
): Assessment {
  const leaveAt = new Date(departureOf(journey).getTime() - schedule.walkToStart * 60_000);
  const arriveAt = new Date(arrivalOf(journey).getTime() + schedule.walkFromEnd * 60_000);
  const toLeave = minutesUntil(leaveAt, now);
  const spare = Math.floor((deadline.getTime() - arriveAt.getTime()) / 60_000);
  const tone: Tone =
    spare < 0 ? 'late' : ahead ? 'planned' : toLeave <= 1 ? 'now' : toLeave <= 15 ? 'soon' : 'good';
  return { tone, leaveAt, arriveAt, toLeave, spare, disrupted: hasSeriousAlert(journey) };
}
