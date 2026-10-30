import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { fonts, spacing, type, useTheme } from '../../theme';
import { formatClock } from '../../utils/time';
import { arrivalOf, departureOf } from '../engine';
import type { Journey, Leg } from '../types';
import type { TripState } from '../useCommute';
import { dayLabel, delayMinutes, lineColour, mainLeg, platformOf, stationOf } from './format';
import { assess, useCommutePalette, type Assessment, type Tone } from './palette';

const MAX_OPTIONS = 2;

/** "Parramatta Station, Platform 1" → "Parramatta": short enough for narrow cards. */
const short = (name: string) => stationOf(name).replace(/ (Station|Light Rail|Wharf)$/, '');

/** Small coloured pill with the line name, like station signage ("T1"). */
export function LineBadge({
  leg,
  size = 'normal',
}: {
  leg: Leg | null;
  size?: 'normal' | 'small' | 'large';
}) {
  const { night, onColour } = useCommutePalette();
  const { colors } = useTheme();
  const label = leg ? (leg.line ?? leg.modeName) : 'Walk';
  const colour = leg ? lineColour(leg) : '#8B8E94';
  return (
    <View
      style={[
        styles.badge,
        size === 'small' && styles.badgeSmall,
        size === 'large' && styles.badgeLarge,
        night ? { borderWidth: 1, borderColor: colors.accent } : { backgroundColor: colour },
      ]}
      accessibilityLabel={`${leg?.modeName ?? 'Walk'} ${label}`}
    >
      <Text
        style={[
          styles.badgeText,
          size === 'small' && styles.badgeTextSmall,
          size === 'large' && styles.badgeTextLarge,
          { color: night ? colors.accent : leg?.line === 'T1' ? onColour : '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/** Same journey across refreshes: line and planned departure of the first service. */
const journeyKey = (j: Journey) => {
  const leg = mainLeg(j) ?? j.legs[0];
  return `${leg.line ?? leg.modeName}|${leg.departPlanned.getTime()}`;
};

/**
 * One person's commute, built to be read from across the room: the colour
 * says whether you're fine, the big number says when to go, the badge and
 * platform say where, and the route line shows each train and change. Tap an
 * option chip to see that one instead, the big number for service notices,
 * and "Live" to refresh.
 */
export function TripCard({
  trip,
  now,
  onRefresh,
}: {
  trip: TripState;
  now: Date;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const palette = useCommutePalette();
  const time = (d: Date) => formatClock(d, settings.clockFormat);
  const [picked, setPicked] = useState<string | null>(null);
  const [showLegs, setShowLegs] = useState(false);
  const { schedule, plan, deadline } = trip;
  const ahead = trip.dayOffset > 0;
  const personIndex = Math.max(
    0,
    settings.commuteSchedules.findIndex((s) => s.id === schedule.id),
  );

  // Options in time order. For a later day, skip night trains hours before the pick.
  const recommendedAt = plan?.recommended ? departureOf(plan.recommended).getTime() : 0;
  const options = plan?.recommended
    ? [
        plan.recommended,
        ...plan.alternatives.filter(
          (j) => !ahead || departureOf(j).getTime() >= recommendedAt - 60 * 60_000,
        ),
      ].sort((a, b) => departureOf(a).getTime() - departureOf(b).getTime())
    : [];
  const shown = options.find((j) => journeyKey(j) === picked) ?? plan?.recommended ?? null;
  const a = shown ? assess(shown, schedule, deadline, now, ahead) : null;
  const tone: Tone = a ? a.tone : trip.error ? 'late' : 'neutral';
  const toneColour = palette.tones[tone];

  // The options either side of the one shown, as chips.
  const shownIndex = shown ? options.indexOf(shown) : 0;
  const first = Math.max(0, Math.min(shownIndex - 1, options.length - MAX_OPTIONS - 1));
  const chips = options.slice(first, first + MAX_OPTIONS + 1).filter((j) => j !== shown);

  const from = schedule.origin ? short(schedule.origin.name) : 'From?';
  const to = schedule.destination ? short(schedule.destination.name) : 'To?';
  const dayColour = ahead ? palette.tones.planned : palette.tones.good;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.tint(toneColour, 0.09), borderLeftColor: toneColour },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.person, { backgroundColor: palette.person(personIndex) }]}>
          <Text style={[styles.personText, { color: palette.onColour }]} numberOfLines={1}>
            {schedule.name}
          </Text>
        </View>
        <Text style={[styles.route, { color: colors.text }]} numberOfLines={1}>
          {from} → {to}
        </Text>
        {/* For a later day the TOMORROW pill already says it's the timetable. */}
        {shown && (!ahead || trip.stale || trip.error) ? (
          <Freshness
            trip={trip}
            live={!ahead && shown.realtime}
            time={time}
            onRefresh={onRefresh}
          />
        ) : null}
        {ahead ? (
          <View style={[styles.dayPill, { backgroundColor: palette.tint(dayColour, 0.18) }]}>
            <Text style={[styles.dayText, { color: dayColour }]}>
              {dayLabel(deadline, trip.dayOffset).toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {shown && a ? (
        <>
          <Pressable
            onPress={() => setShowLegs((v) => !v)}
            disabled={shown.alerts.length === 0}
            accessibilityRole="button"
            accessibilityState={{ expanded: showLegs }}
            accessibilityLabel={heroLabel(a, ahead, time)}
            style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.flex}>
              <LeaveTime a={a} ahead={ahead} colour={toneColour} time={time} />
              <View style={styles.pills}>
                <StatusPill a={a} ahead={ahead} colour={toneColour} time={time} />
                {a.disrupted ? (
                  <Pill icon="alert-triangle" text="Disruption" colour={palette.tones.late} />
                ) : null}
              </View>
            </View>
            <View style={styles.where}>
              <LineBadge leg={mainLeg(shown)} size="large" />
              <Platform leg={mainLeg(shown)} />
            </View>
          </Pressable>

          <Timeline journey={shown} time={time} />

          {chips.length > 0 ? (
            <View style={styles.pills}>
              {chips.map((j) => (
                <OptionChip
                  key={journeyKey(j)}
                  journey={j}
                  a={assess(j, schedule, deadline, now, ahead)}
                  ahead={ahead}
                  time={time}
                  onPress={() => setPicked(journeyKey(j))}
                />
              ))}
            </View>
          ) : null}

          {showLegs ? <Notices journey={shown} /> : null}
        </>
      ) : (
        <EmptyState trip={trip} ahead={ahead} now={now} colour={toneColour} time={time} />
      )}
    </View>
  );
}

function heroLabel(a: Assessment, ahead: boolean, time: (d: Date) => string) {
  if (ahead) return `Leave at ${time(a.leaveAt)}`;
  return a.toLeave <= 0 ? 'Leave now' : `Leave in ${a.toLeave} minutes, at ${time(a.leaveAt)}`;
}

/** The one number that matters: minutes until you go (or the time, for later days). */
function LeaveTime({
  a,
  ahead,
  colour,
  time,
}: {
  a: Assessment;
  ahead: boolean;
  colour: string;
  time: (d: Date) => string;
}) {
  const countdown = !ahead && a.toLeave < 60;
  let value: string;
  let unit = '';
  if (countdown && a.toLeave <= 0) value = 'Now';
  else if (countdown) {
    value = String(a.toLeave);
    unit = 'min';
  } else {
    const [clock, period = ''] = time(a.leaveAt).split(' ');
    value = clock;
    unit = period;
  }
  return (
    // "LEAVE IN" stacked beside the number rather than above it, to save height.
    <View style={styles.bigRow}>
      <Text style={[styles.big, { color: colour }]} numberOfLines={1}>
        {value}
      </Text>
      <View style={styles.bigSide}>
        <Text style={[type.kicker, { color: colour }]}>
          {!countdown ? 'LEAVE AT' : a.toLeave <= 0 ? 'GO' : 'LEAVE IN'}
        </Text>
        {unit ? <Text style={[styles.bigUnit, { color: colour }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function Platform({ leg }: { leg: Leg | null }) {
  const { colors } = useTheme();
  const platform = leg ? platformOf(leg.from) : null;
  if (!platform) return null;
  return (
    <View style={[styles.platform, { borderColor: colors.muted }]}>
      <Text style={[styles.platformLabel, { color: colors.muted }]}>PLAT</Text>
      <Text style={[styles.platformValue, { color: colors.text }]}>{platform}</Text>
    </View>
  );
}

function Pill({
  icon,
  text,
  colour,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  colour: string;
}) {
  const { tint } = useCommutePalette();
  return (
    <View style={[styles.pill, { backgroundColor: tint(colour, 0.18) }]}>
      <Feather name={icon} size={14} color={colour} />
      <Text style={[styles.pillText, { color: colour }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function StatusPill({
  a,
  ahead,
  colour,
  time,
}: {
  a: Assessment;
  ahead: boolean;
  colour: string;
  time: (d: Date) => string;
}) {
  if (a.spare < 0) {
    return <Pill icon="alert-circle" text={`About ${-a.spare} min late`} colour={colour} />;
  }
  if (ahead) {
    return (
      <Pill
        icon="calendar"
        text={`Arrive ${time(a.arriveAt)} · ${a.spare} min spare`}
        colour={colour}
      />
    );
  }
  if (a.tone === 'now') return <Pill icon="zap" text="Go now" colour={colour} />;
  if (a.tone === 'soon') {
    return <Pill icon="clock" text={`Get ready · ${a.spare} min spare`} colour={colour} />;
  }
  return <Pill icon="check-circle" text={`On time · ${a.spare} min spare`} colour={colour} />;
}

/** "● Live 7:21" / "Timetable 7:21", in the late colour when out of date. */
function Freshness({
  trip,
  live,
  time,
  onRefresh,
}: {
  trip: TripState;
  live: boolean;
  time: (d: Date) => string;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const { tones } = useCommutePalette();
  if (!trip.fetchedAt) return null;
  const bad = trip.stale || !!trip.error;
  const colour = bad ? tones.late : live ? tones.good : colors.faint;
  return (
    <Pressable
      onPress={onRefresh}
      accessibilityRole="button"
      accessibilityLabel={`Updated ${time(trip.fetchedAt)}. Refresh`}
      hitSlop={12}
      style={({ pressed }) => [styles.fresh, { opacity: pressed || trip.loading ? 0.5 : 1 }]}
    >
      <View style={[styles.dot, { backgroundColor: colour }]} />
      <Text style={[type.caption, { color: bad ? colour : colors.faint }]} numberOfLines={1}>
        {bad ? `Not updated · ${time(trip.fetchedAt)}` : live ? 'Live' : 'Timetable'}
      </Text>
    </Pressable>
  );
}

/**
 * The trip as a route line, like a transit map: departure and arrival times on
 * the left, a thick bar in each service's line colour, stations in bold, the
 * line and stop count in between, and dotted walks for changes.
 */
function Timeline({ journey, time }: { journey: Journey; time: (d: Date) => string }) {
  const { colors } = useTheme();
  const { night, tones, onColour } = useCommutePalette();
  return (
    <View style={styles.timeline}>
      {journey.legs.map((leg, i) => {
        // A change is shown once: the next service's first stop, with the wait.
        const previous = journey.legs.slice(0, i).findLast((l) => !l.isWalk);
        const isLast = !journey.legs.slice(i + 1).some((l) => !l.isWalk);
        if (leg.isWalk) {
          if (leg.durationMinutes <= 0) return null;
          return (
            <View key={i} style={styles.walkRow}>
              <View style={styles.tlTimes} />
              <View style={styles.rail}>
                {[0, 1, 2].map((d) => (
                  <View key={d} style={[styles.walkDot, { backgroundColor: colors.faint }]} />
                ))}
              </View>
              <Feather name="user" size={13} color={colors.muted} />
              <Text style={[type.caption, { color: colors.muted }]}>
                Walk {leg.durationMinutes} min
              </Text>
            </View>
          );
        }
        const colour = night ? colors.accent : lineColour(leg);
        const darkText = night || leg.line === 'T1';
        // White stops on the line, as on station maps; dim in night themes.
        const dot = night ? colors.background : '#FFFFFF';
        const depart = leg.departEstimated ?? leg.departPlanned;
        const arrive = leg.arriveEstimated ?? leg.arrivePlanned;
        const delay = delayMinutes(leg);
        const platform = platformOf(leg.from);
        const minutes = Math.round((arrive.getTime() - depart.getTime()) / 60_000);
        const changeMinutes = previous
          ? Math.round(
              (depart.getTime() - (previous.arriveEstimated ?? previous.arrivePlanned).getTime()) /
                60_000,
            )
          : null;
        return (
          <View key={i} style={styles.tlLeg}>
            <View style={[styles.tlTimes, styles.tlTimesLeg]}>
              <Text
                style={[styles.tlTime, { color: delay && delay > 0 ? tones.late : colors.text }]}
              >
                {time(depart)}
              </Text>
              {isLast ? (
                <Text style={[styles.tlTime, { color: colors.muted }]}>{time(arrive)}</Text>
              ) : null}
            </View>
            <View style={[styles.tlBar, { backgroundColor: colour }]}>
              <View style={[styles.tlDot, { backgroundColor: dot }]} />
              {isLast ? <View style={[styles.tlDot, { backgroundColor: dot }]} /> : null}
            </View>
            <View style={styles.tlStations}>
              <Text style={[styles.station, { color: colors.text }]} numberOfLines={1}>
                {short(leg.from)}
                {platform ? (
                  <Text style={[styles.stationPlat, { color: colors.muted }]}>
                    {`  Plat ${platform}`}
                  </Text>
                ) : null}
                {changeMinutes !== null ? (
                  <Text style={[styles.stationPlat, { color: colors.faint }]}>
                    {` · ${changeMinutes} min change`}
                  </Text>
                ) : null}
              </Text>
              <View style={styles.tlMid}>
                <View style={[styles.stopsPill, { backgroundColor: colour }]}>
                  <Text style={[styles.stopsText, { color: darkText ? onColour : '#FFFFFF' }]}>
                    {leg.line ?? leg.modeName}
                    {leg.stops > 0 ? ` · ${leg.stops} stop${leg.stops > 1 ? 's' : ''}` : ''}
                  </Text>
                </View>
                <Text
                  style={[type.caption, styles.flex, { color: colors.faint }]}
                  numberOfLines={1}
                >
                  {minutes} min
                  {delay && delay > 0 ? (
                    <Text style={{ color: tones.late }}>{` · ${delay} min late`}</Text>
                  ) : null}
                </Text>
              </View>
              {isLast ? (
                <Text style={[styles.station, { color: colors.text }]} numberOfLines={1}>
                  {short(leg.to)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OptionChip({
  journey,
  a,
  ahead,
  time,
  onPress,
}: {
  journey: Journey;
  a: Assessment;
  ahead: boolean;
  time: (d: Date) => string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { tones } = useCommutePalette();
  const leg = mainLeg(journey);
  const delay = leg ? delayMinutes(leg) : null;
  const colour = tones[a.tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Show the ${leg?.line ?? 'service'} at ${time(departureOf(journey))}`}
      style={({ pressed }) => [styles.chip, { borderColor: colour, opacity: pressed ? 0.6 : 1 }]}
    >
      <LineBadge leg={leg} size="small" />
      <Text style={[styles.chipTime, { color: colors.text }]}>
        {time(departureOf(journey)).split(' ')[0]}
      </Text>
      {delay !== null && delay > 0 ? (
        <Text style={[type.caption, { color: tones.late }]}>+{delay}</Text>
      ) : null}
      <Text style={[type.caption, { color: colour }]}>
        {a.spare < 0
          ? 'late'
          : ahead
            ? `arr ${time(arrivalOf(journey)).split(' ')[0]}`
            : a.toLeave <= 0
              ? 'now'
              : `${a.toLeave} min`}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  trip,
  ahead,
  now,
  colour,
  time,
}: {
  trip: TripState;
  ahead: boolean;
  now: Date;
  colour: string;
  time: (d: Date) => string;
}) {
  const { colors } = useTheme();
  const windowStart = new Date(trip.deadline.getTime() - 3 * 60 * 60_000);
  const message = !trip.configured
    ? 'Choose stations in Settings › Commute'
    : trip.error
      ? trip.error.message
      : trip.loading || (!trip.fetchedAt && (ahead || trip.inWindow))
        ? 'Checking departures…'
        : ahead
          ? 'No timetable found for this trip yet.'
          : trip.inWindow
            ? 'No departures found that you can still catch.'
            : now < windowStart
              ? `Live departures from ${time(windowStart)}`
              : 'Arrival time has passed.';
  return (
    <View style={styles.emptyBox}>
      <Text style={[styles.emptyText, { color: trip.error ? colour : colors.muted }]}>
        {message}
      </Text>
      <Text style={[type.caption, { color: colors.faint }]}>Arrive by {time(trip.deadline)}</Text>
    </View>
  );
}

/** Service notices for the journey, shown when the big number is tapped. */
function Notices({ journey }: { journey: Journey }) {
  const { colors } = useTheme();
  const { tones } = useCommutePalette();
  return (
    <View style={styles.notices}>
      {journey.alerts.map((alert) => {
        const serious = alert.priority === 'veryHigh' || alert.priority === 'high';
        return (
          <Pressable
            key={alert.id}
            onPress={() => alert.url && Linking.openURL(alert.url)}
            accessibilityRole={alert.url ? 'link' : 'text'}
            style={styles.notice}
          >
            <Feather
              name={serious ? 'alert-triangle' : 'info'}
              size={14}
              color={serious ? tones.late : colors.faint}
            />
            <Text style={[type.caption, styles.flex, { color: colors.muted }]} numberOfLines={2}>
              {alert.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: 6,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  person: {
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '40%',
  },
  personText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  route: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  dayPill: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bigSide: {
    paddingBottom: 8,
  },
  big: {
    fontFamily: fonts.light,
    fontSize: 54,
    lineHeight: 56,
    fontVariant: ['tabular-nums'],
  },
  bigUnit: {
    fontFamily: fonts.regular,
    fontSize: 22,
  },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  platform: {
    borderWidth: 1.5,
    borderRadius: 6,
    minWidth: 56,
    paddingVertical: 2,
    alignItems: 'center',
  },
  platformLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  platformValue: {
    fontFamily: fonts.medium,
    fontSize: 26,
    lineHeight: 30,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  fresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeline: {
    gap: 2,
  },
  tlLeg: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  tlTimes: {
    width: 64,
  },
  tlTimesLeg: {
    justifyContent: 'space-between',
  },
  tlTime: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  tlBar: {
    width: 10,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  tlDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tlStations: {
    flex: 1,
    gap: 3,
  },
  station: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 19,
  },
  stationPlat: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  tlMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stopsPill: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  stopsText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  walkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 24,
  },
  rail: {
    width: 10,
    alignItems: 'center',
    gap: 3,
  },
  walkDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    minHeight: 34,
  },
  chipTime: {
    fontFamily: fonts.regular,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
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
  },
  badgeLarge: {
    minWidth: 64,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  badgeTextSmall: {
    fontSize: 11,
  },
  badgeTextLarge: {
    fontSize: 26,
  },
  emptyBox: {
    gap: 4,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.light,
    fontSize: 24,
  },
  notices: {
    gap: 6,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 28,
  },
});
