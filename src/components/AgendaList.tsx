import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { eventTiming } from '../services/calendar';
import { fonts, spacing, useTheme } from '../theme';
import type { AgendaEvent } from '../types/calendar';
import { formatTime24 } from '../utils/time';

interface AgendaListProps {
  events: AgendaEvent[];
  now: Date;
  /** Highlighted as the next event. */
  nextKey: string | null;
  onSelect: (event: AgendaEvent) => void;
  /** Base text size; rows scale from it. */
  size?: number;
}

function AgendaListComponent({ events, now, nextKey, onSelect, size = 18 }: AgendaListProps) {
  return (
    <View>
      {events.map((event) => (
        <AgendaRow
          key={event.key}
          event={event}
          timing={eventTiming(event, now)}
          isNext={event.key === nextKey}
          onSelect={onSelect}
          size={size}
        />
      ))}
    </View>
  );
}

// Re-render once a minute is enough; timings only change on minute boundaries.
export const AgendaList = memo(
  AgendaListComponent,
  (prev, next) =>
    prev.events === next.events &&
    prev.nextKey === next.nextKey &&
    prev.size === next.size &&
    prev.onSelect === next.onSelect &&
    Math.floor(prev.now.getTime() / 60000) === Math.floor(next.now.getTime() / 60000),
);

function AgendaRow({
  event,
  timing,
  isNext,
  onSelect,
  size,
}: {
  event: AgendaEvent;
  timing: ReturnType<typeof eventTiming>;
  isNext: boolean;
  onSelect: (event: AgendaEvent) => void;
  size: number;
}) {
  const { colors, name } = useTheme();
  // Calendar colours can be bright; at night use the theme's own dim tone instead.
  const eventColor = name.startsWith('night') ? colors.faint : (event.color ?? colors.faint);
  const past = timing === 'past';
  // All-day events are 'current' all day long, so they don't get the NOW badge.
  const current = timing === 'current' && !event.allDay;
  const highlight = current || isNext;

  const label = event.allDay
    ? 'All day'
    : `${formatTime24(event.start)}${event.end > event.start ? ` to ${formatTime24(event.end)}` : ''}`;

  return (
    <Pressable
      onPress={() => onSelect(event)}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${label}${current ? ', happening now' : ''}${past ? ', finished' : ''}`}
      style={({ pressed }) => [styles.row, { opacity: past ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.timeColumn, { width: size * 3.6 }]}>
        <Text
          style={[
            styles.time,
            { color: highlight ? colors.text : colors.muted, fontSize: size * 0.95 },
          ]}
        >
          {event.allDay ? 'All day' : formatTime24(event.start)}
        </Text>
        {!event.allDay && event.end > event.start ? (
          <Text style={[styles.endTime, { color: colors.faint, fontSize: size * 0.72 }]}>
            {formatTime24(event.end)}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.bar,
          { backgroundColor: highlight ? colors.accent : eventColor },
          !highlight && { opacity: 0.7 },
        ]}
      />
      <View style={styles.body}>
        {current || isNext ? (
          <Text style={[styles.badge, { color: colors.accent, fontSize: size * 0.6 }]}>
            {current ? 'NOW' : 'NEXT'}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: colors.text, fontSize: size }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location ? (
          <Text
            style={[styles.meta, { color: colors.muted, fontSize: size * 0.75 }]}
            numberOfLines={1}
          >
            {event.location}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  timeColumn: {
    paddingTop: 2,
  },
  time: {
    fontFamily: fonts.regular,
    fontVariant: ['tabular-nums'],
  },
  endTime: {
    fontFamily: fonts.regular,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    fontFamily: fonts.medium,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.regular,
  },
  meta: {
    fontFamily: fonts.regular,
    marginTop: 2,
  },
});
