import { createContext, useContext } from 'react';

import type { AccentChoice, ClockFont, DayTheme, NightTheme } from '../types/settings';

// Night themes are near-black and dim for OLED panels at low brightness.
export type ThemeName = DayTheme | `night-${NightTheme}`;

export interface Palette {
  background: string;
  /** Primary text: the clock itself. Slightly off-white/off-black to avoid glare. */
  text: string;
  /** Secondary text such as the date. */
  muted: string;
  /** Tertiary text such as hints and timestamps. */
  faint: string;
  /** The single restrained accent colour. */
  accent: string;
  /** Hairline dividers, used sparingly. */
  divider: string;
  /** Only for things that need attention, such as overdue reminders. */
  warning: string;
}

export interface Theme {
  name: ThemeName;
  /** Light backgrounds need dark system bar icons. */
  isLight: boolean;
  colors: Palette;
}

const palettes: Record<ThemeName, Palette> = {
  dark: {
    background: '#0E0F11',
    text: '#E9E7E2',
    muted: '#8B8E94',
    faint: '#55585E',
    accent: '#D9A066',
    divider: '#1E2024',
    warning: '#E0876A',
  },
  light: {
    background: '#F4F2EE',
    text: '#1B1C1E',
    muted: '#6B6E74',
    faint: '#A3A5A9',
    accent: '#B26B2B',
    divider: '#E2DFD9',
    warning: '#B8502E',
  },
  // Pure black: OLED pixels switch off entirely, the darkest and most battery-friendly look.
  black: {
    background: '#000000',
    text: '#E6E4DF',
    muted: '#7E8187',
    faint: '#45474C',
    accent: '#D9A066',
    divider: '#161616',
    warning: '#E0876A',
  },
  warm: {
    background: '#15100C',
    text: '#EFE6DA',
    muted: '#9C8F80',
    faint: '#5F554B',
    accent: '#E39A52',
    divider: '#261D16',
    warning: '#E07A5F',
  },
  slate: {
    background: '#0F1419',
    text: '#E3E8EE',
    muted: '#8693A3',
    faint: '#4D5966',
    accent: '#86B7DB',
    divider: '#1C242D',
    warning: '#E0876A',
  },
  'night-amber': {
    background: '#000000',
    text: '#9A6A48',
    muted: '#5E4330',
    faint: '#3A2A1F',
    accent: '#9A6A48',
    divider: '#140E0A',
    warning: '#8A3E2A',
  },
  // Deep red preserves night vision best in a dark bedroom.
  'night-red': {
    background: '#000000',
    text: '#9E3428',
    muted: '#5C1F18',
    faint: '#3A1410',
    accent: '#9E3428',
    divider: '#140606',
    warning: '#9E3428',
  },
};

export const DAY_THEMES: { value: DayTheme; label: string }[] = [
  { value: 'dark', label: 'Charcoal' },
  { value: 'black', label: 'Black' },
  { value: 'warm', label: 'Warm' },
  { value: 'slate', label: 'Slate' },
  { value: 'light', label: 'Light' },
];

export const NIGHT_THEMES: { value: NightTheme; label: string }[] = [
  { value: 'amber', label: 'Amber' },
  { value: 'red', label: 'Red' },
];

// Accent options, with a darker variant so they stay readable on the light theme.
const ACCENTS: Record<Exclude<AccentChoice, 'theme'>, { dark: string; light: string }> = {
  amber: { dark: '#D9A066', light: '#B26B2B' },
  coral: { dark: '#E58A72', light: '#C0563C' },
  green: { dark: '#8DC49A', light: '#3F8A55' },
  blue: { dark: '#86B7DB', light: '#2F6FA0' },
  violet: { dark: '#B49BE0', light: '#7357B0' },
  white: { dark: '#E9E7E2', light: '#1B1C1E' },
};

export const ACCENT_OPTIONS: { value: AccentChoice; label: string; color: string }[] = [
  { value: 'theme', label: 'Theme', color: '#8B8E94' },
  ...(Object.keys(ACCENTS) as Exclude<AccentChoice, 'theme'>[]).map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
    color: ACCENTS[value].dark,
  })),
];

/**
 * Night themes keep their own dim colours; the accent choice only applies by day,
 * so a bright accent can never undo the night look.
 */
export function getTheme(name: ThemeName, accent: AccentChoice = 'theme'): Theme {
  const isLight = name === 'light';
  const base = palettes[name];
  const isNight = name.startsWith('night');
  const colors =
    accent === 'theme' || isNight
      ? base
      : { ...base, accent: ACCENTS[accent][isLight ? 'light' : 'dark'] };
  return { name, isLight, colors };
}

/** Swatch colours for the theme pickers in Settings. */
export function themePreview(name: ThemeName): {
  background: string;
  text: string;
  accent: string;
} {
  const { background, text, accent } = palettes[name];
  return { background, text, accent };
}

/** Font family names, as registered with expo-font in App.tsx. */
export const fonts = {
  thin: 'Inter_200ExtraLight',
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
} as const;

/**
 * Clock digit fonts. widthEm approximates the advance of one digit and of the
 * colon, so the clock can be sized to fill its space without measuring.
 */
export const clockFonts: Record<
  ClockFont,
  { family: string; label: string; digitEm: number; colonEm: number; letterSpacing: number }
> = {
  thin: {
    family: 'Inter_200ExtraLight',
    label: 'Thin',
    digitEm: 0.62,
    colonEm: 0.3,
    letterSpacing: -2,
  },
  light: {
    family: 'Inter_300Light',
    label: 'Light',
    digitEm: 0.63,
    colonEm: 0.3,
    letterSpacing: -2,
  },
  mono: {
    family: 'JetBrainsMono_200ExtraLight',
    label: 'Mono',
    digitEm: 0.6,
    colonEm: 0.6,
    letterSpacing: -4,
  },
  serif: {
    family: 'PlayfairDisplay_400Regular',
    label: 'Serif',
    digitEm: 0.6,
    colonEm: 0.28,
    letterSpacing: 0,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

/**
 * Type scale for everything except the clock digits, which scale with the screen.
 * Sizes are tuned for reading at arm's length on a desk.
 */
export const type = {
  title: { fontFamily: fonts.light, fontSize: 30 },
  heading: { fontFamily: fonts.regular, fontSize: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16 },
  caption: { fontFamily: fonts.regular, fontSize: 13 },
  kicker: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 2 },
  button: { fontFamily: fonts.medium, fontSize: 15 },
} as const;

/** Minimum touch target, per Android accessibility guidance. */
export const TOUCH_TARGET = 48;

export const ThemeContext = createContext<Theme>(getTheme('dark'));

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
