import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../../theme';
import { formatClock } from '../../utils/time';
import { arrivalOf, departureOf, hasSeriousAlert, sydneyTimeOn } from '../engine';
import type { Journey, Leg } from '../types';
import type { TripState } from '../useCommute';
import {
  delayMinutes,
  leaveLabel,
  lineColour,
  mainLeg,
  minutesUntil,
  platformOf,
  stationOf,
} from './format';

const MAX_ROWS = 3;

/** Small coloured pill with the line name, like station signage ("T1"). */
export function LineBadge({
  leg,
  size = 'normal',
}: {
  leg: Leg | null;
  size?: 'normal' | 'small';
}) {
  const label = leg ? (leg.line ?? leg.modeName) : 'Walk';
  const colour = leg ? lineColour(leg) : '#8B8E94';
  return (
    <View
      style={[styles.badge, size === 'small' && styles.badgeSmall, { backgroundColor: colour }]}
      accessibilityLabel={`${leg?.modeName ?? 'Walk'} ${label}`}
    >
      <Text style={[styles.badgeText, size === 'small' && styles.badgeTextSmall]}>{label}</Text>
    </View>
  );
}

/**
 * One person's commute, TripView style: who and where, when to leave, then the
 * next few departures as clean rows with a big countdown. Tap a row for legs.
 */
export function TripCard({ trip, now }: { trip: TripState; now: Date }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const time = (d: Date) => formatClock(d, settings.clockFormat);
  const [open, setOpen] = useState<Journey | null>(null);
  const { schedule, plan } = trip;
  const deadline = sydneyTimeOn(now, schedule.arriveBy);
  const windowStart = new Date(deadline.getTime() - 3 * 60 * 60_000);

  // Show the recommended departure with one earlier and one later option around
  // it, in time order, so the row that matters is always on screen.
  const sorted = plan?.recommended
    ? [plan.recommended, ...plan.alternatives].sort(
        (a, b) => departureOf(a).getTime() - departureOf(b).getTime(),
      )
    : [];
  const recommendedIndex = plan?.recommended ? sorted.indexOf(plan.recommended) : 0;
  const firstRow = Math.max(0, Math.min(recommendedIndex - 1, sorted.length - MAX_ROWS));
  const options = sorted.slice(firstRow, firstRow + MAX_ROWS);
  const late = plan?.status === 'running-late';
  const urgent = plan?.status === 'leave-now' || plan?.status === 'leave-soon';

  let status: string | null = null;
  if (!trip.configured) status = 'Choose stations in Settings';
  else if (plan?.status === 'done') status = 'Arrival time passed';
  else if (plan?.recommended) status = leaveLabel(plan, now);
  else if (trip.loading) status = 'Checking…';
  else if (!trip.inWindow && now < windowStart) status = `From ${time(windowStart)}`;

  const from = schedule.origin ? stationOf(schedule.origin.name) : '—';
  const to = schedule.destination ? stationOf(schedule.destination.name) : '—';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[type.kicker, { color: colors.accent }]} numberOfLines={1}>
          {schedule.name.toUpperCase()}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
          {from} → {to} · arrive by {time(deadline)}
        </Text>
        {trip.fetchedAt ? (
          <Text
            style={[
              type.caption,
              { color: trip.stale || trip.error ? colors.warning : colors.faint },
            ]}
            numberOfLines={1}
          >
            {trip.stale ? 'Not updated since' : 'Updated'} {time(trip.fetchedAt)}
            {plan?.recommended ? (plan.recommended.realtime ? ' · live' : ' · timetable') : ''}
            {trip.error ? ' · last update failed' : ''}
          </Text>
        ) : null}
        {status ? (
          <Text
            style={[
              styles.status,
              { color: late ? colors.warning : urgent ? colors.accent : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {status}
          </Text>
        ) : null}
      </View>

      {options.map((journey, i) => {
        const leg = mainLeg(journey);
        const depart = departureOf(journey);
        const isRecommended = journey === plan!.recommended;
        const tooLate =
          arrivalOf(journey).getTime() + schedule.walkFromEnd * 60000 > plan!.deadline.getTime();
        const delay = leg ? delayMinutes(leg) : null;
        const platform = leg ? platformOf(leg.from) : null;
        const countdown = Math.max(0, minutesUntil(depart, now));
        const expanded = open === journey;
        return (
          <View key={i}>
            <Pressable
              onPress={() => setOpen(expanded ? null : journey)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${leg?.line ?? 'Walk'} at ${time(depart)}, in ${countdown} minutes${isRecommended ? ', recommended' : ''}`}
              style={({ pressed }) => [
                styles.row,
                { borderTopColor: colors.divider, opacity: pressed ? 0.6 : 1 },
                isRecommended && { backgroundColor: colors.divider },
              ]}
            >
              <LineBadge leg={leg} />
              <View style={styles.flex}>
                <Text style={[styles.time, { color: tooLate ? colors.warning : colors.text }]}>
                  {time(depart)}
                  {delay !== null && delay > 0 ? (
                    <Text style={[styles.delay, { color: colors.warning }]}>{`  +${delay}`}</Text>
                  ) : null}
                </Text>
                <Text style={[type.caption, { color: colors.faint }]} numberOfLines={1}>
                  {platform ? `Plat ${platform} · ` : ''}arr {time(arrivalOf(journey))}
                  {journey.transfers > 0
                    ? ` · ${journey.transfers} change${journey.transfers > 1 ? 's' : ''}`
                    : ''}
                  {hasSeriousAlert(journey) ? ' · disruption' : ''}
                  {tooLate ? ' · late' : ''}
                </Text>
              </View>
              <View style={styles.countdown}>
                <Text
                  style={[
                    styles.countdownValue,
                    { color: isRecommended ? colors.accent : colors.text },
                  ]}
                >
                  {countdown}
                </Text>
                <Text style={[type.caption, { color: colors.faint }]}>min</Text>
              </View>
            </Pressable>
            {expanded ? <Legs journey={journey} time={time} /> : null}
          </View>
        );
      })}

      {trip.configured && !plan?.recommended && plan?.status !== 'done' ? (
        <Text
          style={[
            type.caption,
            styles.empty,
            { color: trip.error ? colors.warning : colors.faint },
          ]}
        >
          {trip.error
            ? trip.error.message
            : trip.inWindow
              ? trip.loading
                ? 'Checking departures…'
                : 'No departures found that you can still catch.'
              : now > deadline
                ? 'Arrival time has passed for today.'
                : `Departures appear from ${time(windowStart)}.`}
        </Text>
      ) : null}
    </View>
  );
}

/** Journey legs and any notices, shown when a departure row is tapped. */
function Legs({ journey, time }: { journey: Journey; time: (d: Date) => string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legs}>
      {journey.legs.map((leg, i) => (
        <View key={i} style={styles.leg}>
          {leg.isWalk ? (
            <Feather name="user" size={14} color={colors.faint} style={styles.legIcon} />
          ) : (
            <LineBadge leg={leg} size="small" />
          )}
          <Text style={[type.caption, styles.flex, { color: colors.muted }]}>
            {leg.isWalk
              ? `Walk ${leg.durationMinutes} min to ${stationOf(leg.to)}`
              : `${time(leg.departEstimated ?? leg.departPlanned)} ${stationOf(leg.from)}${
                  platformOf(leg.from) ? ` (Plat ${platformOf(leg.from)})` : ''
                } → ${time(leg.arriveEstimated ?? leg.arrivePlanned)} ${stationOf(leg.to)}`}
          </Text>
        </View>
      ))}
      {journey.alerts.map((alert) => (
        <Pressable
          key={alert.id}
          onPress={() => alert.url && Linking.openURL(alert.url)}
          accessibilityRole={alert.url ? 'link' : 'text'}
          style={styles.leg}
        >
          <Feather
            name={
              alert.priority === 'veryHigh' || alert.priority === 'high' ? 'alert-triangle' : 'info'
            }
            size={14}
            color={
              alert.priority === 'veryHigh' || alert.priority === 'high'
                ? colors.warning
                : colors.faint
            }
            style={styles.legIcon}
          />
          <Text style={[type.caption, styles.flex, { color: colors.muted }]} numberOfLines={2}>
            {alert.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  header: {
    paddingBottom: spacing.sm,
  },
  status: {
    fontFamily: fonts.light,
    fontSize: 30,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  badge: {
    minWidth: 44,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSmall: {
    minWidth: 30,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#FFFFFF',
  },
  badgeTextSmall: {
    fontSize: 11,
  },
  time: {
    fontFamily: fonts.regular,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  delay: {
    fontSize: 15,
  },
  countdown: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  countdownValue: {
    fontFamily: fonts.light,
    fontSize: 26,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  legs: {
    paddingLeft: 60,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  leg: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  legIcon: {
    width: 30,
    marginRight: spacing.sm,
    textAlign: 'center',
  },
  empty: {
    paddingVertical: spacing.md,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
