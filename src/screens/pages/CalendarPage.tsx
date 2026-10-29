import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AgendaList } from '../../components/AgendaList';
import { PillButton } from '../../components/ui';
import type { CalendarApi } from '../../hooks/useCalendar';
import { findNextEvent, eventTiming } from '../../services/calendar';
import { fonts, spacing, useTheme } from '../../theme';
import type { AgendaEvent } from '../../types/calendar';
import { formatLongDate, formatTime24, formatUntil, formatWeekday } from '../../utils/time';

interface CalendarPageProps {
  now: Date;
  calendar: CalendarApi;
  isLandscape: boolean;
  onSelectEvent: (event: AgendaEvent) => void;
  onAddEvent: () => void;
}

export function CalendarPage({
  now,
  calendar,
  isLandscape,
  onSelectEvent,
  onAddEvent,
}: CalendarPageProps) {
  const { colors } = useTheme();
  const next = findNextEvent(calendar.events, now);
  const remaining = calendar.events.filter((e) => eventTiming(e, now) !== 'past').length;

  const summary =
    calendar.status !== 'ready'
      ? ''
      : calendar.events.length === 0
        ? 'Nothing on the calendar today'
        : next
          ? `Next: ${next.title} ${formatUntil(next.start, now)}`
          : remaining > 0
            ? `${remaining} ${remaining === 1 ? 'event' : 'events'} in progress`
            : 'All done for today';

  return (
    <View style={[styles.page, isLandscape && styles.pageLandscape]}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <Text style={[styles.kicker, { color: colors.accent }]}>TODAY</Text>
        <Text style={[styles.weekday, { color: colors.text }]}>{formatWeekday(now)}</Text>
        <Text style={[styles.date, { color: colors.muted }]}>{formatLongDate(now)}</Text>
        {summary ? (
          <Text style={[styles.summary, { color: colors.muted }]} numberOfLines={3}>
            {summary}
          </Text>
        ) : null}
        {calendar.status === 'ready' || calendar.status === 'error' ? (
          <View style={styles.refreshRow}>
            {calendar.status === 'ready' ? (
              <PillButton label="Add event" icon="plus" variant="accent" onPress={onAddEvent} />
            ) : null}
            <Pressable
              onPress={calendar.refresh}
              disabled={calendar.refreshing}
              accessibilityRole="button"
              accessibilityLabel="Refresh calendar"
              hitSlop={8}
              style={({ pressed }) => [
                styles.refresh,
                { borderColor: colors.faint, opacity: pressed || calendar.refreshing ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.refreshText, { color: colors.muted }]}>
                {calendar.refreshing ? 'Refreshing…' : 'Refresh'}
              </Text>
            </Pressable>
            {calendar.lastRefreshed && !isLandscape ? (
              <Text style={[styles.updated, { color: colors.faint }]}>
                Updated {formatTime24(calendar.lastRefreshed)}
              </Text>
            ) : null}
          </View>
        ) : null}
        {calendar.lastRefreshed && isLandscape ? (
          <Text style={[styles.updated, styles.updatedBelow, { color: colors.faint }]}>
            Updated {formatTime24(calendar.lastRefreshed)}
          </Text>
        ) : null}
      </View>

      <View style={styles.agenda}>
        {calendar.status === 'ready' && calendar.events.length > 0 ? (
          <ScrollView contentContainerStyle={styles.agendaContent}>
            <AgendaList
              events={calendar.events}
              now={now}
              nextKey={next?.key ?? null}
              onSelect={onSelectEvent}
              size={isLandscape ? 20 : 18}
            />
          </ScrollView>
        ) : (
          <CalendarState calendar={calendar} />
        )}
      </View>
    </View>
  );
}

function CalendarState({ calendar }: { calendar: CalendarApi }) {
  const { colors } = useTheme();

  let title: string;
  let body: string;
  let action: { label: string; onPress: () => void } | null = null;
  let secondary: { label: string; onPress: () => void } | null = null;

  switch (calendar.status) {
    case 'loading':
      title = 'Reading your calendar…';
      body = '';
      break;
    case 'needs-permission':
      title = 'Show your calendar here';
      body =
        "DeskClock can show today's events from the calendars synced to this phone, including Google Calendar. It only reads events, never changes them, and nothing leaves the phone.";
      action = { label: 'Allow calendar access', onPress: calendar.requestAccess };
      break;
    case 'denied':
      title = 'Calendar access is off';
      body =
        'To show your events, allow Calendar access for DeskClock. If Android no longer asks, turn it on in the app settings under Permissions.';
      action = { label: 'Open app settings', onPress: () => Linking.openSettings() };
      secondary = { label: 'Ask again', onPress: calendar.requestAccess };
      break;
    case 'error':
      title = 'Calendar unavailable';
      body = calendar.error ?? 'Something went wrong reading the calendar.';
      action = { label: 'Try again', onPress: calendar.refresh };
      break;
    default:
      title = 'No events today';
      body =
        "Events appear here once they're synced to this phone. If you expected something, check that Google Calendar sync is on in Android settings, then tap Refresh.";
  }

  return (
    <View style={styles.state}>
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.stateBody, { color: colors.muted }]}>{body}</Text> : null}
      <View style={styles.stateActions}>
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primary,
              { borderColor: colors.accent, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.primaryText, { color: colors.accent }]}>{action.label}</Text>
          </Pressable>
        ) : null}
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primary,
              { borderColor: colors.faint, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.primaryText, { color: colors.muted }]}>{secondary.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  pageLandscape: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerLandscape: {
    width: '34%',
    marginBottom: 0,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  weekday: {
    fontFamily: fonts.light,
    fontSize: 40,
  },
  date: {
    fontFamily: fonts.light,
    fontSize: 18,
    marginTop: 2,
  },
  summary: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  refresh: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  refreshText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  updatedBelow: {
    marginTop: spacing.sm,
  },
  updated: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  agenda: {
    flex: 1,
  },
  agendaContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 520,
  },
  stateTitle: {
    fontFamily: fonts.regular,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  stateBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  stateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primary: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
