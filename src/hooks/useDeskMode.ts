import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';

import { applyAppBrightness, restoreSystemBrightness } from '../services/brightness';
import { useAppActive } from './useAppActive';

const KEEP_AWAKE_TAG = 'desk-mode';

/**
 * Holds desk-mode behaviour while the calling screen is mounted:
 * - keeps the screen on when `keepAwake` is true (it can be switched off, e.g.
 *   for a sleep schedule, so the phone's normal screen timeout applies), and
 * - applies the given app-level brightness.
 * Unmounting (leaving desk mode) releases both.
 *
 * Brightness is re-applied whenever the level changes and whenever the app
 * returns to the foreground, since some Android builds drop the window
 * brightness while the app is hidden.
 *
 * Returns an error message if brightness could not be set.
 */
export function useDeskMode(brightness: number, keepAwake: boolean): string | null {
  const appActive = useAppActive();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [keepAwake]);

  useEffect(() => {
    if (!appActive) return;
    let cancelled = false;
    applyAppBrightness(brightness).then((message) => {
      if (!cancelled) setError(message);
    });
    return () => {
      cancelled = true;
    };
  }, [brightness, appActive]);

  useEffect(() => {
    return () => {
      restoreSystemBrightness();
    };
  }, []);

  return error;
}
