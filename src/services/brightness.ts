import * as Brightness from 'expo-brightness';

import type { DisplayMode, Settings } from '../types/settings';

// Some panels switch off entirely at 0, so never go below this.
export const MIN_BRIGHTNESS = 0.01;

function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** True if `date` falls inside the day window [dayStart, nightStart), which may cross midnight. */
export function isDayTime(date: Date, dayStart: number, nightStart: number): boolean {
  const minute = minuteOfDay(date);
  if (dayStart === nightStart) return true;
  if (dayStart < nightStart) {
    return minute >= dayStart && minute < nightStart;
  }
  return minute >= dayStart || minute < nightStart;
}

export function resolveDisplayMode(date: Date, settings: Settings): DisplayMode {
  if (settings.override !== 'auto') return settings.override;
  return isDayTime(date, settings.dayStart, settings.nightStart) ? 'day' : 'night';
}

export function brightnessFor(mode: DisplayMode, settings: Settings): number {
  return mode === 'night' ? settings.nightBrightness : settings.dayBrightness;
}

/**
 * Sets brightness for this app's window only. Android applies it while the app is
 * in the foreground and reverts to the system level when it leaves, so no
 * WRITE_SETTINGS permission is needed. Returns an error message on failure.
 */
export async function applyAppBrightness(level: number): Promise<string | null> {
  try {
    await Brightness.setBrightnessAsync(Math.min(1, Math.max(MIN_BRIGHTNESS, level)));
    return null;
  } catch (error) {
    return `Brightness control is unavailable (${String(error)}).`;
  }
}

/** Hands brightness back to the system (auto-brightness or the user's level). */
export async function restoreSystemBrightness(): Promise<void> {
  try {
    await Brightness.restoreSystemBrightnessAsync();
  } catch {
    // Nothing useful to do; Android reverts anyway once the app leaves the foreground.
  }
}
