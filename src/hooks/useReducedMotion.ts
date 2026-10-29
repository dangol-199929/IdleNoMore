import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettings } from './useSettings';

/**
 * True when animations should be minimised: either the user chose "Reduced"
 * in Settings, or chose "System" and Android's "Remove animations" is on.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettings();
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setSystemReduced(value))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduced,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (settings.motion === 'reduced') return true;
  if (settings.motion === 'full') return false;
  return systemReduced;
}
