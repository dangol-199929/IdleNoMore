import { Feather } from '@expo/vector-icons';
import { BatteryState, useBatteryLevel, useBatteryState } from 'expo-battery';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, type, useTheme } from '../../theme';
import { WidgetHeader } from '../ui';

/** Battery percentage and charging state; useful to confirm the dock is actually charging. */
export function BatteryWidget({ size }: { size: number }) {
  const { colors } = useTheme();
  const level = useBatteryLevel();
  const state = useBatteryState();
  const known = level >= 0;
  const percent = known ? Math.round(level * 100) : null;
  const charging = state === BatteryState.CHARGING || state === BatteryState.FULL;
  const low = percent !== null && percent <= 20 && !charging;

  const label =
    state === BatteryState.FULL
      ? 'Full'
      : state === BatteryState.CHARGING
        ? 'Charging'
        : state === BatteryState.UNPLUGGED
          ? 'Not charging'
          : 'Unknown';

  return (
    <View>
      <WidgetHeader title="Battery" />
      <View style={styles.row}>
        <Text style={[styles.value, { color: low ? colors.warning : colors.text, fontSize: size }]}>
          {percent !== null ? `${percent}%` : '—'}
        </Text>
      </View>
      <View style={styles.row}>
        <Feather
          name={charging ? 'battery-charging' : 'battery'}
          size={16}
          color={low ? colors.warning : colors.muted}
        />
        <Text style={[type.caption, { color: low ? colors.warning : colors.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    fontFamily: fonts.thin,
    fontVariant: ['tabular-nums'],
  },
});
