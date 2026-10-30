import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Clock } from '../../components/Clock';
import { DateLine } from '../../components/DateLine';
import { CommuteWidget } from '../../commute/ui/CommuteWidget';
import type { CommuteState } from '../../commute/useCommute';
import { AgendaWidget } from '../../components/widgets/AgendaWidget';
import { BatteryWidget } from '../../components/widgets/BatteryWidget';
import { CountdownWidget } from '../../components/widgets/CountdownWidget';
import { PhotoWidget } from '../../components/widgets/PhotoWidget';
import { RemindersWidget } from '../../components/widgets/RemindersWidget';
import type { CalendarApi } from '../../hooks/useCalendar';
import type { PhotosApi } from '../../hooks/usePhotos';
import { useSettings } from '../../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../../theme';
import type { AgendaEvent } from '../../types/calendar';
import type { Reminder } from '../../types/reminder';
import { DASHBOARD_SLOTS, type WidgetId } from '../../types/settings';
import { formatWeekday } from '../../utils/time';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface DashboardPageProps {
  now: Date;
  visible: boolean;
  isLandscape: boolean;
  calendar: CalendarApi;
  reminders: Reminder[];
  photos: PhotosApi;
  onSelectEvent: (event: AgendaEvent) => void;
  onSelectReminder: (reminder: Reminder) => void;
  onCompleteReminder: (reminder: Reminder) => void;
  onAddReminder: () => void;
  onOpenCalendar: () => void;
  onOpenReminders: () => void;
  onAddEvent: () => void;
  commute: CommuteState;
  onOpenCommute: () => void;
}

/** A user-arranged grid of widgets, chosen in Settings › Dashboard. */
export function DashboardPage(props: DashboardPageProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const layout = settings.dashboardLayout;
  const widgets = settings.dashboardWidgets.slice(0, DASHBOARD_SLOTS[layout]);
  const tile = (index: number, style?: object) => (
    <Tile key={index} style={style}>
      {(size) => <DashboardWidget id={widgets[index] ?? 'empty'} size={size} {...props} />}
    </Tile>
  );
  const divider = { backgroundColor: colors.divider };

  // Portrait stacks every slot; the arrangements are designed for landscape.
  if (!props.isLandscape) {
    return <View style={styles.column}>{widgets.map((_, i) => tile(i, styles.flex))}</View>;
  }

  if (layout === 'quad') {
    return (
      <View style={styles.column}>
        <View style={styles.row}>
          {tile(0, styles.flex)}
          <View style={[styles.vLine, divider]} />
          {tile(1, styles.flex)}
        </View>
        <View style={[styles.hLine, divider]} />
        <View style={styles.row}>
          {tile(2, styles.flex)}
          <View style={[styles.vLine, divider]} />
          {tile(3, styles.flex)}
        </View>
      </View>
    );
  }

  if (layout === 'columns') {
    return (
      <View style={styles.row}>
        {tile(0, styles.flex)}
        <View style={[styles.vLine, divider]} />
        {tile(1, styles.flex)}
        <View style={[styles.vLine, divider]} />
        {tile(2, styles.flex)}
      </View>
    );
  }

  // 'feature': one large tile on the left, two stacked on the right.
  return (
    <View style={styles.row}>
      {tile(0, { flex: 1.5 })}
      <View style={[styles.vLine, divider]} />
      <View style={[styles.column, styles.flex]}>
        {tile(1, styles.flex)}
        <View style={[styles.hLine, divider]} />
        {tile(2, styles.flex)}
      </View>
    </View>
  );
}

/** Measures itself so the widget inside can size text to the space it has. */
function Tile({
  style,
  children,
}: {
  style?: object;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s && s.width === width && s.height === height ? s : { width, height }));
  };
  return (
    <View style={[styles.tile, style]} onLayout={onLayout}>
      {size ? children(size) : null}
    </View>
  );
}

function DashboardWidget({
  id,
  size,
  now,
  visible,
  calendar,
  reminders,
  photos,
  onSelectEvent,
  onSelectReminder,
  onCompleteReminder,
  onAddReminder,
  onOpenCalendar,
  onOpenReminders,
  onAddEvent,
  commute,
  onOpenCommute,
}: DashboardPageProps & { id: WidgetId; size: { width: number; height: number } }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const inner = { width: size.width - spacing.lg * 2, height: size.height - spacing.lg * 2 };
  const rows = Math.max(1, Math.floor((inner.height - 40) / 56));
  const bigText = Math.min(inner.height * 0.45, inner.width / 3);

  switch (id) {
    case 'clock': {
      const clockHeight = inner.height * 0.6;
      const fontSize = Math.min(inner.width / 2.95, clockHeight);
      return (
        <View style={styles.center}>
          <Clock date={now} width={inner.width} height={clockHeight} />
          <View style={{ marginTop: fontSize * 0.06 }}>
            <DateLine date={now} size={Math.max(14, Math.round(fontSize * 0.13))} />
          </View>
        </View>
      );
    }
    case 'date':
      return (
        <View style={styles.center}>
          <Text style={[type.kicker, { color: colors.accent }]}>
            {formatWeekday(now).toUpperCase()}
          </Text>
          <Text style={[styles.bigNumber, { color: colors.text, fontSize: bigText }]}>
            {now.getDate()}
          </Text>
          <Text style={[type.heading, { color: colors.muted }]}>
            {MONTHS[now.getMonth()]} {now.getFullYear()}
          </Text>
        </View>
      );
    case 'agenda':
      return (
        <View style={styles.middle}>
          <AgendaWidget
            calendar={calendar}
            now={now}
            limit={Math.min(rows, 5)}
            onSelect={onSelectEvent}
            onOpenCalendar={onOpenCalendar}
            onAddEvent={onAddEvent}
          />
        </View>
      );
    case 'reminders':
      return (
        <View style={styles.middle}>
          <RemindersWidget
            reminders={reminders}
            now={now}
            limit={Math.min(rows, 5)}
            onSelect={onSelectReminder}
            onComplete={onCompleteReminder}
            onAdd={onAddReminder}
            onOpenReminders={onOpenReminders}
          />
        </View>
      );
    case 'photo':
      return (
        <PhotoWidget photos={photos.photos} interval={settings.photoInterval} running={visible} />
      );
    case 'battery':
      return (
        <View style={styles.middle}>
          <BatteryWidget size={Math.min(bigText, 96)} />
        </View>
      );
    case 'commute':
      return (
        <View style={styles.middle}>
          <CommuteWidget commute={commute} now={now} onOpen={onOpenCommute} />
        </View>
      );
    case 'countdown':
      return (
        <View style={styles.middle}>
          <CountdownWidget
            label={settings.countdownLabel}
            target={settings.countdownAt}
            now={now}
            size={Math.min(bigText, 96)}
          />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    flexDirection: 'column',
  },
  tile: {
    padding: spacing.lg,
    overflow: 'hidden',
  },
  vLine: {
    width: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  hLine: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  bigNumber: {
    fontFamily: fonts.thin,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
});
