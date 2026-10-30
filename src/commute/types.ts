/** A stop, station or address returned by the TfNSW stop finder. */
export interface Place {
  /** TfNSW location id, passed back to the trip planner. */
  id: string;
  name: string;
  /** 'stop', 'platform', 'street', 'poi', … as reported by the API. */
  kind: string;
}

export interface CommuteSchedule {
  id: string;
  name: string;
  enabled: boolean;
  /** Weekdays (0 = Sunday … 6 = Saturday). Empty = the default schedule for any other day. */
  days: number[];
  origin: Place | null;
  destination: Place | null;
  /** Required arrival at work, minutes after midnight (Sydney time). */
  arriveBy: number;
  /** Minutes from leaving home to being at the first stop. */
  walkToStart: number;
  /** Minutes from the last stop to the workplace. */
  walkFromEnd: number;
  /** Extra minutes of slack to arrive early. */
  buffer: number;
}

export interface ServiceAlert {
  id: string;
  /** 'veryHigh' | 'high' | 'normal' | 'low' | 'veryLow' as reported. */
  priority: string;
  title: string;
  text: string;
  url: string | null;
}

export interface Leg {
  isWalk: boolean;
  /** TfNSW product class: 1 train, 2 metro, 4 light rail, 5 bus, 7 coach, 9 ferry, 99/100 walk. */
  modeClass: number;
  modeName: string;
  /** Short line name, e.g. "T1". */
  line: string | null;
  /** Where the service is heading, e.g. "Emu Plains". */
  towards: string | null;
  from: string;
  to: string;
  departPlanned: Date;
  departEstimated: Date | null;
  arrivePlanned: Date;
  arriveEstimated: Date | null;
  durationMinutes: number;
  stops: number;
  alerts: ServiceAlert[];
}

export interface Journey {
  legs: Leg[];
  /** First and last legs' times; estimated values only when real-time data was supplied. */
  departPlanned: Date;
  departEstimated: Date | null;
  arrivePlanned: Date;
  arriveEstimated: Date | null;
  transfers: number;
  durationMinutes: number;
  /** True when at least one public-transport leg carried real-time estimates. */
  realtime: boolean;
  alerts: ServiceAlert[];
}

export type TransportErrorKind =
  'no-key' | 'auth' | 'rate-limit' | 'timeout' | 'network' | 'server' | 'bad-response';

export class TransportError extends Error {
  constructor(
    public kind: TransportErrorKind,
    message: string,
  ) {
    super(message);
  }
}
