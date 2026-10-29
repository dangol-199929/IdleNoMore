import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export type ClockPrecision = 'second' | 'minute';

// In minute mode, re-check the wall clock this often, so a manual time or
// time-zone change shows up within seconds, while only re-rendering on change.
const MINUTE_MODE_CHECK_MS = 10_000;

function minuteKey(date: Date): string {
  return `${date.toDateString()} ${date.getHours()}:${date.getMinutes()} ${date.getTimezoneOffset()}`;
}

/**
 * Returns the current time.
 *
 * - 'second': updates on each whole-second boundary (only needed when seconds
 *   are on screen).
 * - 'minute': updates at each minute boundary, which re-renders the desk 60×
 *   less often and saves battery on an always-on display.
 *
 * Timeouts are re-aimed at the next boundary on every tick rather than using
 * setInterval, so the display never drifts. Ticking stops in the background and
 * resyncs when the app returns.
 */
export function useClock(precision: ClockPrecision = 'second'): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const current = new Date();
      if (precision === 'second') {
        setNow(current);
        timer = setTimeout(tick, 1000 - current.getMilliseconds() + 5);
        return;
      }
      setNow((previous) => (minuteKey(previous) === minuteKey(current) ? previous : current));
      const toNextMinute = (60 - current.getSeconds()) * 1000 - current.getMilliseconds() + 5;
      timer = setTimeout(tick, Math.min(toNextMinute, MINUTE_MODE_CHECK_MS));
    };

    const stop = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    tick();

    const subscription = AppState.addEventListener('change', (state) => {
      stop();
      if (state === 'active') {
        tick();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [precision]);

  return now;
}
