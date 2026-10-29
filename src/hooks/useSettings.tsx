import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { loadSettings, saveSettings } from '../storage/settings';
import { DEFAULT_SETTINGS, type Settings } from '../types/settings';

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (changes: Partial<Settings>) => void;
  /** Set when settings could not be read or saved; shown on the settings screen. */
  storageError: string | null;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function initialState(): { settings: Settings; error: string | null } {
  try {
    return { settings: loadSettings(), error: null };
  } catch (error) {
    return {
      settings: DEFAULT_SETTINGS,
      error: `Saved settings could not be loaded, so defaults are in use (${String(error)}).`,
    };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(initialState);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [storageError, setStorageError] = useState<string | null>(initial.error);

  const updateSettings = useCallback((changes: Partial<Settings>) => {
    // Update the UI immediately; persistence happens in the background.
    setSettings((current) => ({ ...current, ...changes }));
    saveSettings(changes).then(
      () => setStorageError(null),
      (error: unknown) => setStorageError(`Settings could not be saved (${String(error)}).`),
    );
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, storageError }),
    [settings, updateSettings, storageError],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return value;
}
