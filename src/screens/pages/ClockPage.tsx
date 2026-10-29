import { Feather } from '@expo/vector-icons';
import { BatteryState, useBatteryLevel, useBatteryState } from 'expo-battery';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Clock } from '../../components/Clock';
import { DateLine } from '../../components/DateLine';
import { AgendaWidget } from '../../components/widgets/AgendaWidget';
import { RemindersWidget } from '../../components/widgets/RemindersWidget';
import type { CalendarApi } from '../../hooks/useCalendar';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSettings } from '../../hooks/useSettings';
import { useSlideshow } from '../../hooks/useSlideshow';
import { ThemeContext, getTheme, spacing, type, useTheme } from '../../theme';
import type { AgendaEvent } from '../../types/calendar';
import type { Photo } from '../../types/photo';
import type { Reminder } from '../../types/reminder';
import type { ClockScale } from '../../types/settings';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Approximate heights (dp) used to decide how many rows fit beside the clock.
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 40;
const SECTION_GAP = spacing.lg;

const SCALE: Record<ClockScale, number> = { small: 0.75, medium: 1, large: 1.25 };

interface ClockPageProps {
  now: Date;
  width: number;
  height: number;
  isLandscape: boolean;
  /** True while this page is on screen; the photo background only rotates then. */
  visible: boolean;
  calendar: CalendarApi;
  reminders: Reminder[];
  photos: Photo[];
  onSelectEvent: (event: AgendaEvent) => void;
  onSelectReminder: (reminder: Reminder) => void;
  onCompleteReminder: (reminder: Reminder) => void;
  onAddReminder: () => void;
  onOpenCalendar: () => void;
  onOpenReminders: () => void;
  onAddEvent: () => void;
}

/**
 * The home page, in one of three presets (Settings › Clock):
 * - Productivity: clock on the left, today's agenda and reminders on the right.
 * - Minimal: just an enormous clock and the date.
 * - Photo clock: the clock over a slowly changing photo.
 */
export function ClockPage(props: ClockPageProps) {
  const { now, width, height, isLandscape, calendar, reminders } = props;
  const { colors } = useTheme();
  const { settings } = useSettings();
  const layout = settings.homeLayout;
  const scale = SCALE[settings.clockScale];
  const left = settings.clockAlign === 'left';

  const withWidgets = layout === 'productivity';
  const clockAreaWidth = withWidgets && isLandscape ? width * 0.54 : width;
  const baseHeight = withWidgets ? (isLandscape ? 0.55 : 0.2) : isLandscape ? 0.62 : 0.3;
  const clockHeight = height * baseHeight * scale;
  const clockWidth = clockAreaWidth * Math.min(1, 0.85 * scale + 0.15);
  const clockFontSize = Math.min(clockWidth / 2.95, clockHeight);
  const dateSize = clamp(Math.round(clockFontSize * 0.14), 16, 34);

  const clock = (
    <View
      style={[
        styles.clockArea,
        { width: clockAreaWidth, alignItems: left ? 'flex-start' : 'center' },
        !(withWidgets && isLandscape) && styles.flex,
      ]}
    >
      <Clock date={now} width={clockWidth} height={clockHeight} />
      <View style={{ marginTop: Math.round(dateSize * 0.5) }}>
        <DateLine date={now} size={dateSize} align={left ? 'left' : 'center'} />
      </View>
    </View>
  );

  const battery = settings.showBattery ? <BatteryBadge /> : null;

  if (layout === 'minimal') {
    return (
      <View style={styles.page}>
        {clock}
        {battery}
      </View>
    );
  }

  if (layout === 'photo') {
    return (
      <PhotoClock photos={props.photos} visible={props.visible}>
        {clock}
        {battery}
      </PhotoClock>
    );
  }

  // Fit as many agenda and reminder rows as the height allows (at least one each).
  const sideHeight = isLandscape ? height : height * 0.55;
  const totalRows = Math.floor((sideHeight - HEADER_HEIGHT * 2 - SECTION_GAP) / ROW_HEIGHT);
  const reminderLimit = totalRows >= 4 ? 2 : 1;
  const agendaLimit = clamp(totalRows - reminderLimit, 1, 3);

  return (
    <View style={[styles.page, isLandscape && styles.row]}>
      {clock}
      <View
        style={[
          styles.widgets,
          isLandscape ? [styles.side, { borderLeftColor: colors.divider }] : styles.sidePortrait,
        ]}
      >
        <AgendaWidget
          calendar={calendar}
          now={now}
          limit={agendaLimit}
          onSelect={props.onSelectEvent}
          onOpenCalendar={props.onOpenCalendar}
          onAddEvent={props.onAddEvent}
        />
        <RemindersWidget
          reminders={reminders}
          now={now}
          limit={reminderLimit}
          onSelect={props.onSelectReminder}
          onComplete={props.onCompleteReminder}
          onAdd={props.onAddReminder}
          onOpenReminders={props.onOpenReminders}
        />
      </View>
      {battery}
    </View>
  );
}

/** The clock over a dimmed photo from the slideshow (or the plain background if none). */
function PhotoClock({
  photos,
  visible,
  children,
}: {
  photos: Photo[];
  visible: boolean;
  children: ReactNode;
}) {
  const { settings } = useSettings();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const show = useSlideshow(photos, Math.max(60, settings.photoInterval), true, visible);
  // Light text reads better over a darkened photo, so swap a light theme for black.
  const overPhoto = show.current && theme.isLight ? getTheme('black', settings.accent) : theme;
  return (
    <View style={styles.page}>
      {show.current ? (
        <>
          {/* Bleed past the page padding so the photo fills the screen. */}
          <Image
            source={{ uri: show.current.uri }}
            style={styles.photoBleed}
            contentFit="cover"
            transition={reducedMotion ? 0 : 1200}
            accessible={false}
          />
          <View style={[styles.photoBleed, styles.scrim]} />
        </>
      ) : null}
      <ThemeContext.Provider value={overPhoto}>{children}</ThemeContext.Provider>
    </View>
  );
}

/** Small battery readout in the top-left corner. */
function BatteryBadge() {
  const { colors } = useTheme();
  const level = useBatteryLevel();
  const state = useBatteryState();
  if (level < 0) return null;
  const charging = state === BatteryState.CHARGING || state === BatteryState.FULL;
  const percent = Math.round(level * 100);
  const low = percent <= 20 && !charging;
  return (
    <View
      style={styles.battery}
      accessible
      accessibilityLabel={`Battery ${percent} percent${charging ? ', charging' : ''}`}
    >
      <Feather
        name={charging ? 'battery-charging' : 'battery'}
        size={16}
        color={low ? colors.warning : colors.faint}
      />
      <Text style={[type.caption, { color: low ? colors.warning : colors.faint }]}>{percent}%</Text>
    </View>
  );
}

const BLEED = 80;

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockArea: {
    justifyContent: 'center',
  },
  widgets: {
    gap: SECTION_GAP,
  },
  side: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginLeft: spacing.lg,
    paddingLeft: spacing.xl,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  sidePortrait: {
    paddingBottom: spacing.xl,
  },
  photoBleed: {
    position: 'absolute',
    top: -BLEED,
    bottom: -BLEED,
    left: -BLEED,
    right: -BLEED,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  battery: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
