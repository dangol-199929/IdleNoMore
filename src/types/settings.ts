import type { CommuteSchedule } from '../commute/types';

/** Which look the app uses during the day. */
export type DayTheme = 'dark' | 'black' | 'warm' | 'slate' | 'light';

/** Colour of the near-black night look. */
export type NightTheme = 'amber' | 'red';

/** 'auto' follows the schedule; 'day' / 'night' pin the mode until changed. */
export type ModeOverride = 'auto' | 'day' | 'night';

export type DisplayMode = 'day' | 'night';

/** The swipeable desk pages. */
export type PageId = 'clock' | 'commute' | 'calendar' | 'reminders' | 'photos' | 'dashboard';
export const ALL_PAGES: PageId[] = [
  'clock',
  'commute',
  'calendar',
  'reminders',
  'photos',
  'dashboard',
];

export type PhotoFit = 'contain' | 'cover';

/** Arrangements for the custom dashboard; each has a fixed number of slots. */
export type DashboardLayout = 'quad' | 'feature' | 'columns';
export const DASHBOARD_SLOTS: Record<DashboardLayout, number> = {
  quad: 4,
  feature: 3,
  columns: 3,
};

export type ClockFormat = '24h' | '12h';
export type ClockFont = 'thin' | 'light' | 'mono' | 'serif';
export type ClockScale = 'small' | 'medium' | 'large';
export type ClockAlign = 'center' | 'left';
export type WeekdayStyle = 'long' | 'short' | 'none';
/** Arrangement of the Clock page. */
export type HomeLayout = 'productivity' | 'minimal' | 'photo';
export type AccentChoice = 'theme' | 'amber' | 'coral' | 'green' | 'blue' | 'violet' | 'white';
export type MotionPreference = 'system' | 'reduced' | 'full';

export type WidgetId =
  | 'clock'
  | 'date'
  | 'agenda'
  | 'reminders'
  | 'photo'
  | 'battery'
  | 'countdown'
  | 'commute'
  | 'empty';

export interface Settings {
  /** Minutes after midnight when day mode starts (default 07:00). */
  dayStart: number;
  /** Minutes after midnight when night mode starts (default 22:00). */
  nightStart: number;
  /** App-level screen brightness, 0–1. */
  dayBrightness: number;
  nightBrightness: number;
  override: ModeOverride;
  dayTheme: DayTheme;
  nightTheme: NightTheme;
  /** Slowly shift the clock by a few pixels to spread OLED wear. */
  burnInShift: boolean;
  /** Calendars the user switched off. Stored as hidden so new calendars show by default. */
  hiddenCalendarIds: string[];
  /** Enabled pages, in swipe order. */
  pages: PageId[];
  /** Page shown on launch; 'last' reopens wherever the user left off. */
  startPage: PageId | 'last';
  lastPage: PageId;
  /** Seconds each photo stays on screen. */
  photoInterval: number;
  photoFit: PhotoFit;
  photoClock: boolean;
  photoCrossfade: boolean;
  photoShuffle: boolean;
  dashboardLayout: DashboardLayout;
  /** Widget for each slot; extra entries are ignored by smaller layouts. */
  dashboardWidgets: WidgetId[];
  countdownLabel: string;
  /** Epoch ms the countdown widget counts down to, or null if unset. */
  countdownAt: number | null;

  clockFormat: ClockFormat;
  showSeconds: boolean;
  showDate: boolean;
  weekdayStyle: WeekdayStyle;
  clockFont: ClockFont;
  clockScale: ClockScale;
  clockAlign: ClockAlign;
  homeLayout: HomeLayout;
  showBattery: boolean;

  accent: AccentChoice;
  showPageDots: boolean;
  /** A visible row of page names, for people who prefer tapping to swiping. */
  showNavStrip: boolean;
  motion: MotionPreference;

  /** Keep the screen on while desk mode is showing. */
  keepAwake: boolean;
  /** Let the screen turn off on its normal timeout during this window. */
  sleepEnabled: boolean;
  sleepStart: number;
  sleepEnd: number;
  /** Minutes without a touch before switching to the photo slideshow; 0 = never. */
  autoSlideshow: number;

  commuteSchedules: CommuteSchedule[];
  /** Show today's commute on the Clock page during the commute window. */
  commuteOnClock: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  dayStart: 7 * 60,
  nightStart: 22 * 60,
  dayBrightness: 0.7,
  nightBrightness: 0.05,
  override: 'auto',
  dayTheme: 'dark',
  nightTheme: 'amber',
  burnInShift: true,
  hiddenCalendarIds: [],
  pages: ALL_PAGES,
  startPage: 'last',
  lastPage: 'clock',
  photoInterval: 30,
  photoFit: 'cover',
  photoClock: true,
  photoCrossfade: true,
  photoShuffle: false,
  dashboardLayout: 'quad',
  dashboardWidgets: ['clock', 'photo', 'agenda', 'battery'],
  countdownLabel: '',
  countdownAt: null,

  clockFormat: '24h',
  showSeconds: false,
  showDate: true,
  weekdayStyle: 'long',
  clockFont: 'thin',
  clockScale: 'medium',
  clockAlign: 'center',
  homeLayout: 'productivity',
  showBattery: false,

  accent: 'theme',
  showPageDots: true,
  showNavStrip: false,
  motion: 'system',

  keepAwake: true,
  sleepEnabled: false,
  sleepStart: 0,
  sleepEnd: 6 * 60,
  autoSlideshow: 0,

  commuteSchedules: [],
  commuteOnClock: true,
};
