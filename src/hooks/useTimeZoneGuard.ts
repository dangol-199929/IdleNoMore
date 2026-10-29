import { reloadAppAsync } from 'expo';
import { getCalendars } from 'expo-localization';
import { useEffect } from 'react';

import { useAppActive } from './useAppActive';
import { formatTime24 } from '../utils/time';

const CHECK_INTERVAL_MS = 60_000;

/**
 * The JavaScript engine reads the device time zone once at start-up, so after a
 * time-zone change (travel, daylight-saving rule updates, a manual change) every
 * JS `Date` would keep showing the old zone. Android itself does update, so we
 * compare the wall time Android reports for its current zone with what JS shows,
 * and restart the JS app when they disagree. Settings, reminders and photos are
 * all stored on disk, so nothing is lost.
 */
function zoneOutOfSync(): boolean {
  const zone = getCalendars()[0]?.timeZone;
  if (!zone) return false;
  const now = new Date();
  const native = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  // Compare hours and minutes only; tolerate a minute boundary between the two reads.
  const js = formatTime24(now);
  const jsPlusOne = formatTime24(new Date(now.getTime() + 60_000));
  return native !== js && native !== jsPlusOne;
}

export function useTimeZoneGuard() {
  const appActive = useAppActive();

  useEffect(() => {
    if (!appActive) return;
    const check = () => {
      try {
        if (zoneOutOfSync()) {
          reloadAppAsync('Device time zone changed').catch(() => {});
        }
      } catch {
        // Intl or localization unavailable: keep running with the current zone.
      }
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [appActive]);
}
