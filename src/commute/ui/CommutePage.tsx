import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '../../components/ui';
import { spacing, type, useTheme } from '../../theme';
import type { CommuteState } from '../useCommute';
import { TripCard } from './TripCard';

interface CommutePageProps {
  now: Date;
  commute: CommuteState;
  isLandscape: boolean;
  onOpenSettings: () => void;
}

/**
 * Today's commutes, one card per person or route. Landscape puts two cards side
 * by side; more scroll. Kept deliberately sparse, like a departure board.
 */
export function CommutePage({ now, commute, isLandscape, onOpenSettings }: CommutePageProps) {
  const { colors } = useTheme();

  if (!commute.hasSchedules || commute.hasKey === false || commute.trips.length === 0) {
    const title = !commute.hasSchedules
      ? 'Set up your commute'
      : commute.hasKey === false
        ? 'Add your Transport for NSW key'
        : 'No commute this week';
    const body = !commute.hasSchedules
      ? 'Add a trip for each person: where from, where to, and when you need to arrive.'
      : commute.hasKey === false
        ? 'Paste your free Open Data key in Settings › Commute to see live departures.'
        : 'None of your trips are switched on for the next 7 days.';
    return (
      <View style={styles.empty}>
        <Text style={[type.title, { color: colors.text }]}>{title}</Text>
        <Text style={[type.body, styles.emptyBody, { color: colors.muted }]}>{body}</Text>
        <PillButton
          label="Commute settings"
          icon="sliders"
          variant="accent"
          onPress={onOpenSettings}
          style={styles.emptyButton}
        />
      </View>
    );
  }

  const columns = isLandscape ? Math.min(2, commute.trips.length) : 1;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.grid, columns > 1 && styles.row]}>
          {commute.trips.map((trip) => (
            <View
              key={trip.schedule.id}
              style={[styles.cell, { flexBasis: `${100 / columns - 3}%` }]}
            >
              <TripCard trip={trip} now={now} onRefresh={commute.refresh} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.sm,
  },
  grid: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 560,
  },
  emptyBody: {
    marginTop: spacing.sm,
    lineHeight: 23,
  },
  emptyButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
});
