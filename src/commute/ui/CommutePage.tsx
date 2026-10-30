import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';
import { spacing, type, useTheme } from '../../theme';
import { formatClock } from '../../utils/time';
import { arrivalOf, departureOf, hasSeriousAlert } from '../engine';
import type { CommuteState } from '../useCommute';
import type { Journey, Leg, ServiceAlert } from '../types';
import { CommuteWidget } from './CommuteWidget';
import { delayMinutes, legLabel } from './format';

interface CommutePageProps {
  now: Date;
  commute: CommuteState;
  isLandscape: boolean;
  onOpenSettings: () => void;
}

/** Full commute view: recommendation, journey legs, alerts and alternatives. */
export function CommutePage({ now, commute, isLandscape, onOpenSettings }: CommutePageProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const time = (d: Date) => formatClock(d, settings.clockFormat);
  const [chosen, setChosen] = useState<Journey | null>(null);
  const plan = commute.plan;
  const options = plan?.recommended ? [plan.recommended, ...plan.alternatives] : [];
  const shown = chosen && options.includes(chosen) ? chosen : (plan?.recommended ?? null);

  return (
    <View style={[styles.page, isLandscape && styles.row]}>
      <View style={[styles.summary, isLandscape && styles.summaryLandscape]}>
        <CommuteWidget commute={commute} now={now} onOpen={() => {}} size="large" />
        {commute.schedule?.origin && commute.schedule.destination ? (
          <Text style={[type.caption, styles.route, { color: colors.muted }]} numberOfLines={2}>
            {commute.schedule.origin.name} → {commute.schedule.destination.name}
          </Text>
        ) : null}
        {plan?.reason && plan.recommended ? (
          <Text style={[type.caption, { color: colors.faint }]}>{plan.reason}</Text>
        ) : null}
        {commute.scheduleNote && commute.schedule ? (
          <Text style={[type.caption, { color: colors.faint }]}>{commute.scheduleNote}</Text>
        ) : null}
        <View style={styles.actions}>
          <PillButton
            label={commute.loading ? 'Checking…' : 'Refresh'}
            icon="refresh-cw"
            onPress={commute.refresh}
            disabled={commute.loading || !commute.schedule}
          />
          <PillButton label="Settings" icon="sliders" onPress={onOpenSettings} />
        </View>
        {commute.error && plan ? (
          <Text style={[type.caption, { color: colors.warning }]}>
            {commute.error.message} Showing the last result from{' '}
            {commute.fetchedAt ? time(commute.fetchedAt) : 'earlier'}.
          </Text>
        ) : null}
        <Text style={[type.caption, styles.attribution, { color: colors.faint }]}>
          Journey data: Transport for NSW (CC BY 4.0). Times are estimates, not guarantees.
        </Text>
      </View>

      <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
        {shown ? (
          <>
            <Text style={[type.kicker, { color: colors.accent }]}>
              {shown === plan?.recommended ? 'RECOMMENDED JOURNEY' : 'SELECTED JOURNEY'}
            </Text>
            {shown.legs.map((leg, i) => (
              <LegRow key={i} leg={leg} time={time} />
            ))}
            {shown.alerts.length > 0 ? (
              <>
                <Text
                  style={[
                    type.kicker,
                    styles.section,
                    { color: hasSeriousAlert(shown) ? colors.warning : colors.muted },
                  ]}
                >
                  {hasSeriousAlert(shown)
                    ? 'DISRUPTIONS ON THIS JOURNEY'
                    : 'NOTICES ON THIS JOURNEY'}
                </Text>
                {shown.alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </>
            ) : (
              <Text style={[type.caption, styles.section, { color: colors.faint }]}>
                No alerts were attached to this journey. That doesn’t guarantee there are no
                disruptions; check again before you leave.
              </Text>
            )}
            {options.length > 1 ? (
              <>
                <Text style={[type.kicker, styles.section, { color: colors.accent }]}>
                  OTHER OPTIONS
                </Text>
                {options.map((j, i) => (
                  <OptionRow
                    key={i}
                    journey={j}
                    selected={j === shown}
                    recommended={j === plan?.recommended}
                    deadline={plan!.deadline}
                    time={time}
                    onPress={() => setChosen(j)}
                  />
                ))}
              </>
            ) : null}
          </>
        ) : (
          <Text style={[type.body, { color: colors.muted }]}>
            {commute.schedule
              ? 'Journey details appear here once they’ve been checked.'
              : 'Add a commute schedule in Settings to see journeys here.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function LegRow({ leg, time }: { leg: Leg; time: (d: Date) => string }) {
  const { colors } = useTheme();
  const delay = delayMinutes(leg);
  const depart = leg.departEstimated ?? leg.departPlanned;
  const arrive = leg.arriveEstimated ?? leg.arrivePlanned;
  return (
    <View style={styles.leg}>
      <Text style={[type.body, styles.legTime, { color: colors.text }]}>{time(depart)}</Text>
      <Feather
        name={leg.isWalk ? 'user' : leg.modeClass === 5 ? 'truck' : 'navigation'}
        size={16}
        color={leg.isWalk ? colors.faint : colors.accent}
        style={styles.legIcon}
      />
      <View style={styles.flex}>
        <Text style={[type.body, { color: leg.isWalk ? colors.muted : colors.text }]}>
          {leg.isWalk ? `Walk ${leg.durationMinutes} min` : legLabel(leg)}
          {delay !== null && delay !== 0 ? (
            <Text style={{ color: delay > 0 ? colors.warning : colors.muted }}>
              {delay > 0 ? `  +${delay} min` : `  ${delay} min`}
            </Text>
          ) : null}
        </Text>
        <Text style={[type.caption, { color: colors.faint }]}>
          {leg.from} → {leg.to}
          {!leg.isWalk ? ` · arrive ${time(arrive)}` : ''}
          {!leg.isWalk && leg.stops > 0 ? ` · ${leg.stops} stops` : ''}
          {!leg.isWalk ? (leg.departEstimated ? ' · live' : ' · timetable') : ''}
        </Text>
      </View>
    </View>
  );
}

function AlertRow({ alert }: { alert: ServiceAlert }) {
  const { colors } = useTheme();
  const serious = alert.priority === 'veryHigh' || alert.priority === 'high';
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((o) => !o)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={styles.alertRow}
    >
      <Feather
        name={serious ? 'alert-triangle' : 'info'}
        size={16}
        color={serious ? colors.warning : colors.muted}
        style={styles.legIcon}
      />
      <View style={styles.flex}>
        <Text style={[type.body, { color: colors.text }]}>{alert.title}</Text>
        {open && alert.text ? (
          <Text style={[type.caption, { color: colors.muted }]}>{alert.text}</Text>
        ) : null}
        {open && alert.url ? (
          <Text
            style={[type.caption, { color: colors.accent }]}
            onPress={() => Linking.openURL(alert.url!)}
          >
            More details
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function OptionRow({
  journey,
  selected,
  recommended,
  deadline,
  time,
  onPress,
}: {
  journey: Journey;
  selected: boolean;
  recommended: boolean;
  deadline: Date;
  time: (d: Date) => string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const late = arrivalOf(journey) > deadline;
  const lines = journey.legs
    .filter((l) => !l.isWalk)
    .map((l) => l.line ?? l.modeName)
    .join(' › ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        { borderColor: selected ? colors.accent : colors.divider, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[type.body, styles.legTime, { color: colors.text }]}>
        {time(departureOf(journey))}
      </Text>
      <View style={styles.flex}>
        <Text style={[type.body, { color: colors.text }]} numberOfLines={1}>
          {lines || 'Walk'}
          {recommended ? <Text style={{ color: colors.accent }}>{'  recommended'}</Text> : null}
        </Text>
        <Text style={[type.caption, { color: late ? colors.warning : colors.faint }]}>
          Arrive {time(arrivalOf(journey))} · {journey.durationMinutes} min ·{' '}
          {journey.transfers === 0
            ? 'direct'
            : `${journey.transfers} change${journey.transfers > 1 ? 's' : ''}`}
          {hasSeriousAlert(journey) ? ' · disruption' : ''}
          {late ? ' · late' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  summary: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryLandscape: {
    width: '38%',
    justifyContent: 'center',
    marginBottom: 0,
  },
  route: {
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  attribution: {
    marginTop: spacing.sm,
  },
  detail: {
    flex: 1,
  },
  detailContent: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  leg: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 52,
    paddingVertical: spacing.xs,
  },
  legTime: {
    width: 72,
    fontVariant: ['tabular-nums'],
  },
  legIcon: {
    marginTop: 3,
    marginRight: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
});
