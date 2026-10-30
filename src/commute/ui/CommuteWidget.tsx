import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WidgetHeader } from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../../theme';
import { formatClock } from '../../utils/time';
import { departureOf } from '../engine';
import type { CommuteState, TripState } from '../useCommute';
import { dayLabel, mainLeg } from './format';
import { assess, useCommutePalette } from './palette';
import { LineBadge } from './TripCard';

interface CommuteWidgetProps {
  commute: CommuteState;
  now: Date;
  onOpen: () => void;
}

/**
 * Compact commute summary for the Clock page and Dashboard: one line per
 * person — line badge, departure time and when to leave. Tap for the full page.
 */
export function CommuteWidget({ commute, now, onOpen }: CommuteWidgetProps) {
  const { colors } = useTheme();
  const trips = commute.trips.filter((t) => t.configured);

  return (
    <View>
      <WidgetHeader title="Commute" onPress={onOpen} accessibilityLabel="Open commute" />
      {trips.length === 0 ? (
        <Text style={[type.body, { color: colors.faint }]}>
          {commute.hasSchedules ? 'No commute today' : 'Set up in Settings › Commute'}
        </Text>
      ) : (
        trips.map((trip) => (
          <TripLine key={trip.schedule.id} trip={trip} now={now} onOpen={onOpen} />
        ))
      )}
    </View>
  );
}

function TripLine({ trip, now, onOpen }: { trip: TripState; now: Date; onOpen: () => void }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const palette = useCommutePalette();
  const time = (d: Date) => formatClock(d, settings.clockFormat);
  const journey = trip.plan?.recommended ?? null;
  const leg = journey ? mainLeg(journey) : null;
  const ahead = trip.dayOffset > 0;
  const a = journey ? assess(journey, trip.schedule, trip.deadline, now, ahead) : null;
  const colour = palette.tones[a ? a.tone : trip.error ? 'late' : 'neutral'];
  const personIndex = Math.max(
    0,
    settings.commuteSchedules.findIndex((s) => s.id === trip.schedule.id),
  );

  const status = a
    ? ahead
      ? `${dayLabel(trip.deadline, trip.dayOffset)} · leave ${time(a.leaveAt)}`
      : a.toLeave <= 0
        ? 'Go now'
        : a.toLeave < 60
          ? `Leave in ${a.toLeave} min`
          : `Leave at ${time(a.leaveAt)}`
    : trip.error
      ? 'Unavailable'
      : trip.loading
        ? 'Checking…'
        : '—';
  const detail = a ? (a.spare < 0 ? `${-a.spare}m late` : `arrive ${time(a.arriveAt)}`) : '';

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${trip.schedule.name}: ${status}`}
      style={({ pressed }) => [styles.line, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.stripe, { backgroundColor: colour }]} />
      {journey ? <LineBadge leg={leg} /> : <View style={styles.badgeSpace} />}
      <View style={styles.flex}>
        <Text style={[styles.status, { color: colour }]} numberOfLines={1}>
          {status}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
          <Text style={{ color: palette.person(personIndex) }}>{trip.schedule.name}</Text>
          {journey ? ` · ${time(departureOf(journey))}` : ''}
          {detail ? <Text style={{ color: colour }}>{` · ${detail}`}</Text> : null}
          {trip.stale ? <Text style={{ color: palette.tones.late }}> · not updated</Text> : null}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginVertical: 8,
  },
  badgeSpace: {
    width: 44,
  },
  status: {
    fontFamily: fonts.light,
    fontSize: 22,
  },
});
