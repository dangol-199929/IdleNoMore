import { TransportError, type Journey, type Leg, type Place, type ServiceAlert } from './types';

// Transport for NSW Open Data, Trip Planner APIs (rapidJSON output).
// Data © Transport for NSW, licensed under CC BY 4.0.
const BASE = 'https://api.transport.nsw.gov.au/v1/tp';
const TIMEOUT_MS = 12_000;
export const SYDNEY_TZ = 'Australia/Sydney';

type Json = Record<string, unknown>;

async function request(path: string, params: Record<string, string>, apiKey: string | null) {
  if (!apiKey)
    throw new TransportError('no-key', 'Add your Transport for NSW API key in Settings.');

  const query = new URLSearchParams({
    outputFormat: 'rapidJSON',
    coordOutputFormat: 'EPSG:4326',
    ...params,
  }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}?${query}`, {
      headers: { Accept: 'application/json', Authorization: `apikey ${apiKey}` },
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TransportError('timeout', 'Transport for NSW took too long to respond.');
    }
    throw new TransportError('network', `No connection to Transport for NSW (${String(error)}).`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new TransportError(
      'auth',
      'Transport for NSW rejected the API key. Check it in Settings.',
    );
  }
  if (response.status === 403 || response.status === 429) {
    throw new TransportError(
      'rate-limit',
      'Too many requests to Transport for NSW. Try again shortly.',
    );
  }
  if (!response.ok) {
    throw new TransportError('server', `Transport for NSW returned an error (${response.status}).`);
  }
  try {
    return (await response.json()) as Json;
  } catch {
    throw new TransportError(
      'bad-response',
      'Transport for NSW sent a response that could not be read.',
    );
  }
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const date = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Search stations, stops and addresses by name. */
export async function findPlaces(text: string, apiKey: string | null): Promise<Place[]> {
  const data = await request(
    'stop_finder',
    { type_sf: 'any', name_sf: text, TfNSWSF: 'true' },
    apiKey,
  );
  return arr(data.locations)
    .map(obj)
    .map((l) => ({
      id: str(l.id) ?? '',
      name: str(l.disassembledName) ?? str(l.name) ?? '',
      kind: str(l.type) ?? 'place',
      // Lower matchQuality-ranked results come later; keep the API's order otherwise.
      best: l.isBest === true,
    }))
    .filter((p) => p.id && p.name)
    .sort((a, b) => Number(b.best) - Number(a.best))
    .slice(0, 8)
    .map(({ id, name, kind }) => ({ id, name, kind }));
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAlerts(value: unknown): ServiceAlert[] {
  return arr(value)
    .map(obj)
    .map((a) => ({
      id: str(a.id) ?? `${str(a.subtitle) ?? ''}${str(a.urlText) ?? ''}`,
      priority: str(a.priority) ?? 'normal',
      title: str(a.subtitle) ?? str(a.urlText) ?? 'Service alert',
      text: stripHtml(str(a.content) ?? ''),
      url: str(a.url),
    }));
}

const WALK_CLASSES = new Set([99, 100, 107]);

function parseLeg(raw: unknown): Leg | null {
  const leg = obj(raw);
  const origin = obj(leg.origin);
  const destination = obj(leg.destination);
  const transportation = obj(leg.transportation);
  const product = obj(transportation.product);
  const modeClass = typeof product.class === 'number' ? product.class : 0;

  const departPlanned = date(origin.departureTimePlanned);
  const arrivePlanned = date(destination.arrivalTimePlanned);
  if (!departPlanned || !arrivePlanned) return null;

  const duration = typeof leg.duration === 'number' ? leg.duration : 0;
  // The planner echoes the timetable into the "estimated" fields even when it has
  // no live data, so only treat them as live when the leg is real-time controlled.
  const live = leg.isRealtimeControlled === true;
  return {
    isWalk: WALK_CLASSES.has(modeClass),
    modeClass,
    modeName: str(product.name) ?? (WALK_CLASSES.has(modeClass) ? 'Walk' : 'Service'),
    line: str(transportation.disassembledName) ?? str(transportation.number),
    towards: str(obj(transportation.destination).name),
    from: str(origin.disassembledName) ?? str(origin.name) ?? '',
    to: str(destination.disassembledName) ?? str(destination.name) ?? '',
    departPlanned,
    departEstimated: live ? date(origin.departureTimeEstimated) : null,
    arrivePlanned,
    arriveEstimated: live ? date(destination.arrivalTimeEstimated) : null,
    durationMinutes: Math.round(duration / 60),
    stops: Math.max(0, arr(leg.stopSequence).length - 1),
    alerts: parseAlerts(leg.infos),
  };
}

function parseJourney(raw: unknown): Journey | null {
  const legs = arr(obj(raw).legs)
    .map(parseLeg)
    .filter((l): l is Leg => l !== null);
  if (legs.length === 0) return null;

  const first = legs[0];
  const last = legs[legs.length - 1];
  const transit = legs.filter((l) => !l.isWalk);
  const seen = new Set<string>();
  const alerts = legs
    .flatMap((l) => l.alerts)
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  const departEstimated = first.departEstimated;
  const arriveEstimated = last.arriveEstimated;
  const arrive = arriveEstimated ?? last.arrivePlanned;
  const depart = departEstimated ?? first.departPlanned;

  return {
    legs,
    departPlanned: first.departPlanned,
    departEstimated,
    arrivePlanned: last.arrivePlanned,
    arriveEstimated,
    transfers: Math.max(0, transit.length - 1),
    durationMinutes: Math.round((arrive.getTime() - depart.getTime()) / 60000),
    realtime: transit.some((l) => l.departEstimated !== null || l.arriveEstimated !== null),
    alerts,
  };
}

/** Sydney-local date and time strings in the trip planner's itdDate / itdTime format. */
export function sydneyDateTime(at: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}${get('month')}${get('day')}`,
    time: `${get('hour')}${get('minute')}`,
  };
}

/**
 * Journeys between two places. `mode` 'arrive' finds trips arriving by `at`;
 * 'depart' finds trips leaving after `at`.
 */
export async function planJourneys(
  originId: string,
  destinationId: string,
  at: Date,
  mode: 'arrive' | 'depart',
  apiKey: string | null,
): Promise<Journey[]> {
  const { date, time } = sydneyDateTime(at);
  const data = await request(
    'trip',
    {
      depArrMacro: mode === 'arrive' ? 'arr' : 'dep',
      itdDate: date,
      itdTime: time,
      type_origin: 'any',
      name_origin: originId,
      type_destination: 'any',
      name_destination: destinationId,
      calcNumberOfTrips: '6',
      TfNSWTR: 'true',
    },
    apiKey,
  );
  const messages = arr(data.systemMessages).map(obj);
  const journeys = arr(data.journeys)
    .map(parseJourney)
    .filter((j): j is Journey => j !== null);
  if (journeys.length === 0 && messages.some((m) => m.type === 'error')) {
    const text = str(messages[0]?.text) ?? 'No journeys found for these stops.';
    throw new TransportError('bad-response', text);
  }
  return journeys;
}
