import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommuteSection } from '../commute/ui/CommuteSection';
import { CalendarsSection } from '../components/settings/CalendarsSection';
import { ClockSection } from '../components/settings/ClockSection';
import { DashboardSection } from '../components/settings/DashboardSection';
import { DisplaySection } from '../components/settings/DisplaySection';
import { PhotosSection } from '../components/settings/PhotosSection';
import { PowerSection } from '../components/settings/PowerSection';
import { ScreensSection } from '../components/settings/ScreensSection';
import type { IconName } from '../components/ui';
import { Feather } from '@expo/vector-icons';
import { useSettings } from '../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../theme';

export type SettingsTab =
  'display' | 'clock' | 'commute' | 'screens' | 'photos' | 'dashboard' | 'power' | 'calendars';

const TABS: { id: SettingsTab; label: string; icon: IconName }[] = [
  { id: 'display', label: 'Display', icon: 'sun' },
  { id: 'clock', label: 'Clock', icon: 'clock' },
  { id: 'commute', label: 'Commute', icon: 'navigation' },
  { id: 'screens', label: 'Screens', icon: 'layers' },
  { id: 'photos', label: 'Photos', icon: 'image' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'power', label: 'Power', icon: 'battery-charging' },
  { id: 'calendars', label: 'Calendars', icon: 'calendar' },
];

interface SettingsScreenProps {
  onClose: () => void;
  onPreviewNight: () => void;
  /** Section to open; App remembers it so returning to Settings reopens it. */
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

/**
 * Outside desk mode: system bars visible, screen may sleep, system brightness.
 * Landscape shows sections in a side rail; portrait uses a scrolling tab row.
 * Every change is saved immediately.
 */
export function SettingsScreen({ onClose, onPreviewNight, tab, onTabChange }: SettingsScreenProps) {
  const { storageError } = useSettings();
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const selectTab = onTabChange;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const tabs = TABS.map((t) => {
    const selected = t.id === tab;
    return (
      <Pressable
        key={t.id}
        onPress={() => selectTab(t.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          isLandscape ? styles.railItem : styles.chip,
          selected && { backgroundColor: colors.divider },
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name={t.icon} size={18} color={selected ? colors.accent : colors.muted} />
        <Text
          style={[
            type.body,
            { color: selected ? colors.text : colors.muted },
            selected && { fontFamily: fonts.medium },
          ]}
        >
          {t.label}
        </Text>
      </Pressable>
    );
  });

  const content = (
    <ScrollView
      // Keyed by tab so each section opens scrolled to the top.
      key={tab}
      style={styles.flex}
      contentContainerStyle={{
        paddingLeft: isLandscape ? spacing.xl : insets.left + spacing.lg,
        paddingRight: insets.right + spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      {storageError ? (
        <Text style={[type.body, styles.error, { color: colors.warning }]}>{storageError}</Text>
      ) : null}
      {tab === 'display' ? <DisplaySection onPreviewNight={onPreviewNight} /> : null}
      {tab === 'clock' ? <ClockSection /> : null}
      {tab === 'screens' ? <ScreensSection /> : null}
      {tab === 'photos' ? <PhotosSection /> : null}
      {tab === 'dashboard' ? <DashboardSection /> : null}
      {tab === 'power' ? <PowerSection /> : null}
      {tab === 'calendars' ? <CalendarsSection /> : null}
      {tab === 'commute' ? <CommuteSection /> : null}
    </ScrollView>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <StatusBar hidden={false} style={isLight ? 'dark' : 'light'} />
      <NavigationBar hidden={false} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
        <Text style={[type.title, { color: colors.text }]}>Settings</Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back to desk display"
          hitSlop={12}
          style={styles.done}
        >
          <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
        </Pressable>
      </View>

      {isLandscape ? (
        <View style={[styles.flex, styles.row]}>
          <ScrollView
            style={[styles.rail, { borderRightColor: colors.divider }]}
            contentContainerStyle={{
              paddingLeft: insets.left + spacing.md,
              paddingBottom: spacing.lg,
            }}
            accessibilityRole="tablist"
          >
            {tabs}
          </ScrollView>
          {content}
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chips}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
            accessibilityRole="tablist"
          >
            {tabs}
          </ScrollView>
          {content}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  done: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  doneText: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  rail: {
    flexGrow: 0,
    width: 220,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  chips: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
  },
  error: {
    marginBottom: spacing.lg,
  },
});
