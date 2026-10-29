import { ALL_PAGES, DEFAULT_SETTINGS, type Settings } from '../types/settings';
import { getDatabase } from './database';

const MINUTES_PER_DAY = 24 * 60;

type Validator<K extends keyof Settings> = (value: unknown) => value is Settings[K];

const isMinuteOfDay = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < MINUTES_PER_DAY;
const isLevel = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const oneOf =
  <T extends string>(...values: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as string[]).includes(v);
const WIDGETS = [
  'clock',
  'date',
  'agenda',
  'reminders',
  'photo',
  'battery',
  'countdown',
  'empty',
] as const;

// One validator per key, so a malformed or outdated stored value falls back
// to its default instead of breaking the app.
const validators: { [K in keyof Settings]: Validator<K> } = {
  dayStart: isMinuteOfDay,
  nightStart: isMinuteOfDay,
  dayBrightness: isLevel,
  nightBrightness: isLevel,
  override: oneOf('auto', 'day', 'night'),
  dayTheme: oneOf('dark', 'black', 'warm', 'slate', 'light'),
  nightTheme: oneOf('amber', 'red'),
  burnInShift: isBool,
  hiddenCalendarIds: (v): v is string[] =>
    Array.isArray(v) && v.every((id) => typeof id === 'string'),
  pages: (v): v is Settings['pages'] =>
    Array.isArray(v) &&
    v.length > 0 &&
    new Set(v).size === v.length &&
    v.every((p) => (ALL_PAGES as unknown[]).includes(p)),
  startPage: oneOf('last', ...ALL_PAGES),
  lastPage: oneOf(...ALL_PAGES),
  photoInterval: (v): v is number => typeof v === 'number' && v >= 5 && v <= 3600,
  photoFit: oneOf('contain', 'cover'),
  photoClock: isBool,
  photoCrossfade: isBool,
  photoShuffle: isBool,
  dashboardLayout: oneOf('quad', 'feature', 'columns'),
  dashboardWidgets: (v): v is Settings['dashboardWidgets'] =>
    Array.isArray(v) && v.length >= 4 && v.every((w) => oneOf(...WIDGETS)(w)),
  countdownLabel: (v): v is string => typeof v === 'string' && v.length <= 60,
  countdownAt: (v): v is number | null => v === null || (typeof v === 'number' && v > 0),

  clockFormat: oneOf('24h', '12h'),
  showSeconds: isBool,
  showDate: isBool,
  weekdayStyle: oneOf('long', 'short', 'none'),
  clockFont: oneOf('thin', 'light', 'mono', 'serif'),
  clockScale: oneOf('small', 'medium', 'large'),
  clockAlign: oneOf('center', 'left'),
  homeLayout: oneOf('productivity', 'minimal', 'photo'),
  showBattery: isBool,

  accent: oneOf('theme', 'amber', 'coral', 'green', 'blue', 'violet', 'white'),
  showPageDots: isBool,
  showNavStrip: isBool,
  motion: oneOf('system', 'reduced', 'full'),

  keepAwake: isBool,
  sleepEnabled: isBool,
  sleepStart: isMinuteOfDay,
  sleepEnd: isMinuteOfDay,
  autoSlideshow: (v): v is number => typeof v === 'number' && v >= 0 && v <= 240,
};

export function loadSettings(): Settings {
  const rows = getDatabase().getAllSync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const settings: Settings = { ...DEFAULT_SETTINGS };

  for (const { key, value } of rows) {
    if (!(key in validators)) continue;
    const typedKey = key as keyof Settings;
    try {
      const parsed: unknown = JSON.parse(value);
      if (validators[typedKey](parsed)) {
        (settings as unknown as Record<string, unknown>)[typedKey] = parsed;
      }
    } catch {
      // Ignore unparsable values; the default stays in place.
    }
  }

  return settings;
}

export async function saveSettings(changes: Partial<Settings>): Promise<void> {
  const db = getDatabase();
  const entries = Object.entries(changes);
  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        JSON.stringify(value),
      );
    }
  });
}
