import {
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  useFonts,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_200ExtraLight } from '@expo-google-fonts/jetbrains-mono';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { Feather } from '@expo/vector-icons';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider, useSettings } from './src/hooks/useSettings';
import { useTimeZoneGuard } from './src/hooks/useTimeZoneGuard';
import { DeskScreen } from './src/screens/DeskScreen';
import { SettingsScreen, type SettingsTab } from './src/screens/SettingsScreen';
import { ThemeContext, getTheme } from './src/theme';
import type { PageId } from './src/types/settings';

type Screen = 'desk' | 'settings';

const NIGHT_PREVIEW_MS = 15000;

function Root() {
  const { settings } = useSettings();
  useTimeZoneGuard();
  const theme = useMemo(
    () => getTheme(settings.dayTheme, settings.accent),
    [settings.dayTheme, settings.accent],
  );
  const [screen, setScreen] = useState<Screen>('desk');
  const [nightPreview, setNightPreview] = useState(false);
  // Remembers the desk page across trips to Settings within this session.
  const [deskPage, setDeskPage] = useState<PageId | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('display');

  useEffect(() => {
    // Root view colour, so no white flash shows behind the app on rotation.
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme]);

  useEffect(() => {
    if (!nightPreview) return;
    const timer = setTimeout(() => setNightPreview(false), NIGHT_PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [nightPreview]);

  const openSettings = useCallback(() => setScreen('settings'), []);
  const closeSettings = useCallback(() => setScreen('desk'), []);
  const previewNight = useCallback(() => {
    setNightPreview(true);
    setScreen('desk');
  }, []);
  const endPreview = useCallback(() => {
    setNightPreview(false);
    setScreen('settings');
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      {screen === 'desk' ? (
        <DeskScreen
          onOpenSettings={openSettings}
          nightPreview={nightPreview}
          onEndPreview={endPreview}
          resumePage={deskPage}
          onPageChange={setDeskPage}
        />
      ) : (
        <SettingsScreen
          onClose={closeSettings}
          onPreviewNight={previewNight}
          tab={settingsTab}
          onTabChange={setSettingsTab}
        />
      )}
    </ThemeContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_200ExtraLight,
    PlayfairDisplay_400Regular,
    ...Feather.font,
  });

  // If fonts fail to load we still render, falling back to the system font.
  const ready = fontsLoaded || fontError !== null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        {ready ? <Root /> : <View style={{ flex: 1, backgroundColor: '#0E0F11' }} />}
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
