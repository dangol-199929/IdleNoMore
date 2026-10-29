import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CalendarApi } from '../../hooks/useCalendar';
import { eventTiming } from '../../services/calendar';
import { spacing, type, useTheme } from '../../theme';
import type { AgendaEvent } from '../../types/calendar';
import { formatTime24, formatUntil } from '../../utils/time';
import { EmptyText, WidgetHeader } from '../ui';

interface AgendaWidgetProps {
  calendar: CalendarApi;
  now: Date;
  /** How many events to list. */
  limit: number;
  onSelect: (event: AgendaEvent) => void;
  onOpenCalendar: () => void;
}

/** The rest of today at a glance: what's on now and the next few events. */
export function AgendaWidget({
  calendar,
  now,
  limit,
  onSelect,
  onOpenCalendar,
}: AgendaWidgetProps) {
  const { colors } = useTheme();
  const remaining = calendar.events.filter((e) => eventTiming(e, now) !== 'past');
  // Timed events first; all-day events are context, not something to act on.
  const shown = [...remaining.filter((e) => !e.allDay), ...remaining.filter((e) => e.allDay)].slice(
    0,
    limit,
  );
  const firstUpcoming = remaining.find((e) => !e.allDay && e.start > now) ?? null;

  let body;
  if (calendar.status === 'loading') {
    body = <EmptyText>Reading calendar…</EmptyText>;
  } else if (calendar.status === 'needs-permission' || calendar.status === 'denied') {
    body = (
      <Pressable onPress={onOpenCalendar} accessibilityRole="button" style={styles.minHeight}>
        <EmptyText>Calendar not connected. Tap to set up.</EmptyText>
      </Pressable>
    );
  } else if (calendar.status === 'error') {
    body = <EmptyText>Calendar unavailable right now.</EmptyText>;
  } else if (shown.length === 0) {
    body = (
      <EmptyText>
        {calendar.events.length === 0 ? 'Nothing on the calendar today' : 'Nothing else today'}
      </EmptyText>
    );
  } else {
    body = shown.map((event) => {
      const current = !event.allDay && eventTiming(event, now) === 'current';
      const next = event === firstUpcoming;
      const highlight = current || next;
      const detail = event.allDay
        ? 'All day'
        : current
          ? `Now · until ${formatTime24(event.end)}`
          : next
            ? formatUntil(event.start, now)
            : `${formatTime24(event.start)} – ${formatTime24(event.end)}`;
      return (
        <Pressable
          key={event.key}
          onPress={() => onSelect(event)}
          accessibilityRole="button"
          accessibilityLabel={`${event.title}, ${detail}`}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.time, { color: highlight ? colors.accent : colors.muted }]}>
            {event.allDay ? '—' : formatTime24(event.start)}
          </Text>
          <View style={styles.text}>
            <Text style={[type.heading, { color: colors.text }]} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={[type.caption, { color: highlight ? colors.muted : colors.faint }]}>
              {detail}
            </Text>
          </View>
        </Pressable>
      );
    });
  }

  return (
    <View>
      <WidgetHeader
        title="Today"
        detail={
          calendar.lastRefreshed ? `updated ${formatTime24(calendar.lastRefreshed)}` : undefined
        }
        onPress={onOpenCalendar}
        accessibilityLabel="Open calendar"
      />
      <View style={styles.body}>{body}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.xs,
  },
  minHeight: {
    minHeight: 48,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  time: {
    ...type.body,
    fontSize: 18,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
    width: 64,
  },
  text: {
    flex: 1,
  },
});
