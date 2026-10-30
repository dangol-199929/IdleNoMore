import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventDetails } from '../components/EventDetails';
import { EventEditor } from '../components/EventEditor';
import { ReminderEditor } from '../components/ReminderEditor';
import { NavStrip } from '../components/NavStrip';
import { IconButton, PageDots } from '../components/ui';
import { CommutePage } from '../commute/ui/CommutePage';
import { useCommute } from '../commute/useCommute';
import { useCalendar } from '../hooks/useCalendar';
import { usePhotos } from '../hooks/usePhotos';
import { useClock } from '../hooks/useClock';
import { useDeskMode } from '../hooks/useDeskMode';
import { useReminders } from '../hooks/useReminders';
import { useSettings } from '../hooks/useSettings';
import { brightnessFor, isDayTime, resolveDisplayMode } from '../services/brightness';
import { ThemeContext, fonts, getTheme, spacing } from '../theme';
import type { AgendaEvent } from '../types/calendar';
import type { Reminder } from '../types/reminder';
import type { PageId } from '../types/settings';
import type { SettingsTab } from './SettingsScreen';
import { burnInOffset } from '../utils/burnIn';
import { CalendarPage } from './pages/CalendarPage';
import { ClockPage } from './pages/ClockPage';
import { DashboardPage } from './pages/DashboardPage';
import { PhotosPage } from './pages/PhotosPage';
import { RemindersPage } from './pages/RemindersPage';


interface DeskScreenProps {
  onOpenSettings: (tab?: SettingsTab) => void;
  /** When true, show night mode regardless of the schedule (settings preview). */
  nightPreview: boolean;
  onEndPreview: () => void;
  /** Page to reopen when coming back from Settings; null on app launch. */
  resumePage: PageId | null;
  onPageChange: (page: PageId) => void;
}

/**
 * Desk mode: a horizontally swipeable set of pages. While this screen is
 * mounted the screen stays on, system bars are hidden and the scheduled
 * brightness is applied; leaving it (settings) restores normal behaviour.
 */
export function DeskScreen({
  onOpenSettings,
  nightPreview,
  onEndPreview,
  resumePage,
  onPageChange,
}: DeskScreenProps) {
  const { settings, updateSettings } = useSettings();
  // Per-second updates only when seconds are on screen; otherwise once a minute.
  const now = useClock(settings.showSeconds ? 'second' : 'minute');
  const calendar = useCalendar(now.toDateString(), settings.hiddenCalendarIds);
  const reminders = useReminders();
  const photos = usePhotos();
  const pages = settings.pages;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const mode = nightPreview ? 'night' : resolveDisplayMode(now, settings);
  // During the optional sleep window the screen may turn off on the phone's own timeout.
  const inSleepWindow =
    settings.sleepEnabled && isDayTime(now, settings.sleepStart, settings.sleepEnd);
  const brightnessError = useDeskMode(
    brightnessFor(mode, settings),
    settings.keepAwake && !inSleepWindow,
  );
  const theme = useMemo(
    () =>
      getTheme(
        mode === 'night' ? `night-${settings.nightTheme}` : settings.dayTheme,
        settings.accent,
      ),
    [mode, settings.dayTheme, settings.nightTheme, settings.accent],
  );

  const [page, setPage] = useState(() => {
    const wanted =
      resumePage ?? (settings.startPage === 'last' ? settings.lastPage : settings.startPage);
    return Math.max(0, pages.indexOf(wanted));
  });
  const currentPage = pages[Math.min(page, pages.length - 1)];
  // Only fetch transport data while something commute-related is on screen.
  const commuteVisible =
    !nightPreview &&
    (currentPage === 'commute' ||
      (currentPage === 'clock' &&
        settings.commuteOnClock &&
        settings.homeLayout === 'productivity') ||
      (currentPage === 'dashboard' && settings.dashboardWidgets.includes('commute')));
  const commute = useCommute(now, commuteVisible);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const pager = useRef<PagerView>(null);
  const [lastTouch, setLastTouch] = useState(() => Date.now());
  const goTo = useCallback(
    (key: PageId) => {
      const index = pages.indexOf(key);
      if (index >= 0) pager.current?.setPage(index);
    },
    [pages],
  );

  // Optionally drift to the photo slideshow after a while without a touch.
  const idleMinutes = Math.floor((now.getTime() - lastTouch) / 60000);
  const shouldAutoSlideshow =
    settings.autoSlideshow > 0 &&
    idleMinutes >= settings.autoSlideshow &&
    currentPage !== 'photos' &&
    photos.photos.length > 0 &&
    pages.includes('photos') &&
    !nightPreview &&
    !selectedEvent &&
    !editing &&
    !addingEvent;
  useEffect(() => {
    if (shouldAutoSlideshow) goTo('photos');
  }, [shouldAutoSlideshow, goTo]);

  const handleBackgroundPress = useCallback(() => {
    // Taps only end a night preview; settings live behind the gear icon.
    if (nightPreview) onEndPreview();
  }, [nightPreview, onEndPreview]);

  const isLandscape = width > height;
  const padding = isLandscape ? spacing.xl : spacing.lg;
  const contentWidth = width - insets.left - insets.right - padding * 2;
  const contentHeight = height - insets.top - insets.bottom - padding * 2;
  const offset = settings.burnInShift ? burnInOffset(now) : { x: 0, y: 0 };

  const pageStyle = {
    flex: 1,
    paddingTop: insets.top + padding,
    paddingBottom: insets.bottom + padding,
    paddingLeft: insets.left + padding,
    paddingRight: insets.right + padding,
  };
  const shift = { flex: 1, transform: [{ translateX: offset.x }, { translateY: offset.y }] };

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar hidden style={theme.isLight ? 'dark' : 'light'} />
      <NavigationBar hidden />
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        // Any touch counts as activity for the idle slideshow timer.
        onTouchStart={() => setLastTouch(Date.now())}
      >
        <PagerView
          // Remount on rotation: the native pager keeps stale page sizes otherwise,
          // which pushes the right-hand content off screen.
          key={isLandscape ? 'landscape' : 'portrait'}
          ref={pager}
          style={styles.pager}
          initialPage={page}
          scrollEnabled={!nightPreview}
          onPageSelected={(e) => {
            const position = e.nativeEvent.position;
            setPage(position);
            const id = pages[position];
            if (id) {
              onPageChange(id);
              updateSettings({ lastPage: id });
            }
          }}
        >
          {pages.map((key) =>
            key === 'photos' ? (
              // Photos run edge to edge and handle their own taps.
              <View key={key} style={styles.fullBleed}>
                <PhotosPage
                  now={now}
                  visible={currentPage === 'photos' && !nightPreview}
                  photos={photos}
                  insets={insets}
                  onOpenSettings={() => onOpenSettings()}
                />
              </View>
            ) : (
              <Pressable
                key={key}
                onPress={handleBackgroundPress}
                accessible={false}
                style={pageStyle}
              >
                <View style={shift}>
                  {key === 'clock' ? (
                    <ClockPage
                      visible={currentPage === 'clock'}
                      photos={photos.photos}
                      now={now}
                      width={contentWidth}
                      height={contentHeight}
                      isLandscape={isLandscape}
                      calendar={calendar}
                      reminders={reminders.reminders}
                      onSelectEvent={setSelectedEvent}
                      onSelectReminder={setEditing}
                      onCompleteReminder={(r) => reminders.setCompleted(r, true)}
                      onAddReminder={() => setEditing('new')}
                      onOpenCalendar={() => goTo('calendar')}
                      onOpenReminders={() => goTo('reminders')}
                      onAddEvent={() => setAddingEvent(true)}
                      commute={commute}
                      onOpenCommute={() => goTo('commute')}
                    />
                  ) : key === 'commute' ? (
                    <CommutePage
                      now={now}
                      commute={commute}
                      isLandscape={isLandscape}
                      onOpenSettings={() => onOpenSettings('commute')}
                    />
                  ) : key === 'calendar' ? (
                    <CalendarPage
                      now={now}
                      calendar={calendar}
                      isLandscape={isLandscape}
                      onSelectEvent={setSelectedEvent}
                      onAddEvent={() => setAddingEvent(true)}
                    />
                  ) : key === 'reminders' ? (
                    <RemindersPage
                      now={now}
                      reminders={reminders}
                      isLandscape={isLandscape}
                      onAdd={() => setEditing('new')}
                      onEdit={setEditing}
                    />
                  ) : (
                    <DashboardPage
                      now={now}
                      visible={currentPage === 'dashboard'}
                      isLandscape={isLandscape}
                      calendar={calendar}
                      reminders={reminders.reminders}
                      photos={photos}
                      onSelectEvent={setSelectedEvent}
                      onSelectReminder={setEditing}
                      onCompleteReminder={(r) => reminders.setCompleted(r, true)}
                      onAddReminder={() => setEditing('new')}
                      onOpenCalendar={() => goTo('calendar')}
                      onOpenReminders={() => goTo('reminders')}
                      onAddEvent={() => setAddingEvent(true)}
                      commute={commute}
                      onOpenCommute={() => goTo('commute')}
                    />
                  )}
                </View>
              </Pressable>
            ),
          )}
        </PagerView>

        {!nightPreview && !(currentPage === 'photos' && photos.photos.length > 0) ? (
          <>
            <View style={[styles.settingsButton, { top: insets.top + 4, right: insets.right + 4 }]}>
              <IconButton
                icon="settings"
                onPress={() => onOpenSettings()}
                accessibilityLabel="Settings"
              />
            </View>
            {settings.showNavStrip ? (
              <View style={[styles.dots, { bottom: insets.bottom }]}>
                <NavStrip pages={pages} current={page} onSelect={(i) => goTo(pages[i])} />
              </View>
            ) : settings.showPageDots ? (
              <View
                pointerEvents="none"
                style={[styles.dots, { bottom: insets.bottom + spacing.sm }]}
              >
                <PageDots count={pages.length} index={page} />
              </View>
            ) : null}
          </>
        ) : null}

        {nightPreview ? (
          <Text
            style={[
              styles.previewHint,
              { color: theme.colors.faint, bottom: insets.bottom + spacing.md },
            ]}
          >
            Night preview · tap to return
          </Text>
        ) : null}

        {brightnessError && !nightPreview ? (
          <Text
            style={[
              styles.previewHint,
              { color: theme.colors.warning, bottom: insets.bottom + spacing.md },
            ]}
          >
            {brightnessError}
          </Text>
        ) : null}
      </View>
      <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <EventEditor
        visible={addingEvent}
        onSave={calendar.addEvent}
        onClose={() => setAddingEvent(false)}
      />
      <ReminderEditor
        target={editing}
        onSave={reminders.save}
        onDelete={reminders.remove}
        onClose={() => setEditing(null)}
      />
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  fullBleed: {
    flex: 1,
  },
  settingsButton: {
    position: 'absolute',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});
