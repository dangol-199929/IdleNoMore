import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../../theme';
import { formatClock } from '../../utils/time';
import { hasSeriousAlert } from '../engine';
import type { CommuteState } from '../useCommute';
import { delayMinutes, leaveLabel, legLabel, mainLeg } from './format';
import { EmptyText, WidgetHeader } from '../../components/ui';

interface CommuteWidgetProps {
  commute: CommuteState;
  now: Date;
  onOpen: () => void;
  /** Larger type for the Commute page header and big dashboard tiles. */
  size?: 'compact' | 'large';
}

/** Glanceable commute status: when to leave, which service, when you'll arrive. */
export function CommuteWidget({ commute, now, onOpen, size = 'compact' }: CommuteWidgetProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const time = (d: Date) => formatClock(d, settings.clockFormat);
  const { plan, schedule } = commute;
  const big = size === 'large';

  let body;
  if (settings.commuteSchedules.length === 0) {
    body = <EmptyText>Set up your commute in Settings › Commute.</EmptyText>;
  } else if (!schedule) {
    body = <EmptyText>{commute.scheduleNote ?? 'No commute today.'}</EmptyText>;
  } else if (commute.hasKey === false) {
    body = <EmptyText>Add your Transport for NSW API key in Settings › Commute.</EmptyText>;
  } else if (!plan) {
    body = (
      <EmptyText>
        {commute.error
          ? commute.error.message
          : commute.loading
            ? 'Checking journeys…'
            : (commute.scheduleNote ??
              (commute.inWindow
                ? 'Checking journeys…'
                : 'Journey times appear in the 3 hours before you need to arrive.'))}
      </EmptyText>
    );
  } else if (plan.status === 'done') {
    body = <EmptyText>{plan.reason}</EmptyText>;
  } else if (!plan.recommended) {
    body = (
      <Text style={[type.body, { color: colors.warning }]}>
        No journeys found that you can still catch.
      </Text>
    );
  } else {
    const leg = mainLeg(plan.recommended);
    const delay = leg ? delayMinutes(leg) : null;
    const late = plan.status === 'running-late';
    const urgent = plan.status === 'leave-now' || plan.status === 'leave-soon';
    // Only high-priority alerts warrant a warning on the glanceable widget; routine
    // notices (lifts, station updates) are listed on the Commute page.
    const disrupted = hasSeriousAlert(plan.recommended);
    body = (
      <View>
        <Text
          style={[
            styles.leave,
            {
              color: late ? colors.warning : urgent ? colors.accent : colors.text,
              fontSize: big ? 44 : 28,
            },
          ]}
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {leaveLabel(plan, now)}
        </Text>
        {leg ? (
          <Text style={[type.body, { color: colors.text }]} numberOfLines={1}>
            {legLabel(leg)} · {time(leg.departEstimated ?? leg.departPlanned)}
            {delay !== null && delay > 0 ? (
              <Text style={{ color: colors.warning }}>{`  +${delay} min`}</Text>
            ) : null}
          </Text>
        ) : null}
        <Text style={[type.caption, { color: late ? colors.warning : colors.muted }]}>
          {late
            ? `Arrive ~${time(plan.arriveWorkAt!)}, about ${plan.lateByMinutes} min late`
            : `Arrive ~${time(plan.arriveWorkAt!)} · due ${time(plan.deadline)}`}
          {plan.recommended.realtime ? ' · live' : ' · timetable'}
        </Text>
        {disrupted ? (
          <View style={styles.alert}>
            <Feather name="alert-triangle" size={14} color={colors.warning} />
            <Text style={[type.caption, { color: colors.warning }]} numberOfLines={1}>
              {plan.recommended.alerts.find(
                (a) => a.priority === 'veryHigh' || a.priority === 'high',
              )?.title ?? 'Service alert on this journey'}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const updated = commute.fetchedAt
    ? `${commute.stale ? 'as of' : 'updated'} ${time(commute.fetchedAt)}`
    : undefined;

  return (
    <View>
      <WidgetHeader
        title={schedule ? schedule.name || 'Commute' : 'Commute'}
        detail={updated}
        onPress={onOpen}
        accessibilityLabel="Open commute"
      />
      <Pressable onPress={onOpen} accessibilityRole="button" style={styles.body}>
        {body}
        {commute.stale && plan ? (
          <Text style={[type.caption, { color: colors.warning }]}>
            Not updated recently: times may have changed.
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.xs,
    minHeight: 48,
  },
  leave: {
    fontFamily: fonts.light,
    fontVariant: ['tabular-nums'],
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
});
