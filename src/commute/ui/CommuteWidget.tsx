import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WidgetHeader } from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../../theme';
import { formatClock } from '../../utils/time';
import { departureOf } from '../engine';
import type { CommuteState, TripState } from '../useCommute';
import { dayLabel, leaveLabel, mainLeg } from './format';
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
  const plan = trip.plan;
  const journey = plan?.recommended ?? null;
  const leg = journey ? mainLeg(journey) : null;
  const late = plan?.status === 'running-late';
  const urgent = plan?.status === 'leave-now' || plan?.status === 'leave-soon';

  const ahead = trip.dayOffset > 0;
  const time = (d: Date) => formatClock(d, settings.clockFormat);
  const status = journey
    ? ahead && plan!.leaveHomeAt
      ? `${dayLabel(trip.deadline, trip.dayOffset)} · leave ${time(plan!.leaveHomeAt)}`
      : leaveLabel(plan!, now)
    : trip.error
      ? 'Unavailable'
      : trip.loading
        ? 'Checking…'
        : plan?.status === 'done'
          ? 'Done for today'
          : '—';

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${trip.schedule.name}: ${status}`}
      style={({ pressed }) => [styles.line, { opacity: pressed ? 0.6 : 1 }]}
    >
      {journey ? <LineBadge leg={leg} /> : <View style={styles.badgeSpace} />}
      <View style={styles.flex}>
        <Text
          style={[
            styles.status,
            { color: late ? colors.warning : urgent && !ahead ? colors.accent : colors.text },
          ]}
          numberOfLines={1}
        >
          {status}
        </Text>
        <Text
          style={[type.caption, { color: trip.stale ? colors.warning : colors.faint }]}
          numberOfLines={1}
        >
          {trip.schedule.name}
          {journey ? ` · ${time(departureOf(journey))}` : ''}
          {late ? ` · ~${plan!.lateByMinutes} min late` : ''}
          {trip.stale ? ' · not updated' : ''}
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
  badgeSpace: {
    width: 44,
  },
  status: {
    fontFamily: fonts.light,
    fontSize: 22,
  },
});
