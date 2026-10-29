import { StyleSheet, Text, View } from 'react-native';

import { fonts, type, useTheme } from '../../theme';
import { formatLongDate, formatTime24 } from '../../utils/time';
import { EmptyText, WidgetHeader } from '../ui';

/** Days (or hours) until a date the user chose in Settings. */
export function CountdownWidget({
  label,
  target,
  now,
  size,
}: {
  label: string;
  target: number | null;
  now: Date;
  size: number;
}) {
  const { colors } = useTheme();
  if (target === null) {
    return (
      <View>
        <WidgetHeader title="Countdown" />
        <EmptyText>Set a date in Settings › Dashboard.</EmptyText>
      </View>
    );
  }

  const ms = target - now.getTime();
  const done = ms <= 0;
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  const value = done ? 'Now' : days >= 1 ? String(days) : String(Math.max(hours, 0));
  const unit = done
    ? ''
    : days >= 1
      ? days === 1
        ? 'day'
        : 'days'
      : hours === 1
        ? 'hour'
        : 'hours';
  const when = new Date(target);

  return (
    <View>
      <WidgetHeader title={label || 'Countdown'} />
      <View style={styles.row}>
        <Text style={[styles.value, { color: colors.text, fontSize: size }]}>{value}</Text>
        <Text style={[type.heading, { color: colors.muted }]}>{unit}</Text>
      </View>
      <Text style={[type.caption, { color: colors.faint }]}>
        {formatLongDate(when)} · {formatTime24(when)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  value: {
    fontFamily: fonts.thin,
    fontVariant: ['tabular-nums'],
  },
});
