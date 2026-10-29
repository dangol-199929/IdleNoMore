import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../hooks/useSettings';
import { fonts, spacing, useTheme } from '../theme';
import { formatLongDate, formatWeekday, formatWeekdayShort } from '../utils/time';

interface DateLineProps {
  date: Date;
  /** Base font size; the clock screen derives it from the clock size. */
  size: number;
  align?: 'center' | 'left';
}

/** Weekday and date under the clock, styled per Settings › Clock. */
function DateLineComponent({ date, size, align = 'center' }: DateLineProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  if (!settings.showDate) return null;

  const weekday =
    settings.weekdayStyle === 'short' ? formatWeekdayShort(date) : formatWeekday(date);
  const longDate = formatLongDate(date);
  const alignSelf = align === 'left' ? 'flex-start' : 'center';

  return (
    <View
      accessible
      accessibilityLabel={`${formatWeekday(date)}, ${longDate}`}
      style={{ alignItems: alignSelf }}
    >
      {settings.weekdayStyle !== 'none' ? (
        <Text
          style={[
            styles.weekday,
            {
              color: colors.accent,
              fontSize: Math.round(size * 0.62),
              letterSpacing: size * 0.18,
            },
          ]}
          allowFontScaling={false}
        >
          {weekday.toUpperCase()}
        </Text>
      ) : null}
      <Text style={[styles.date, { color: colors.muted, fontSize: size }]} allowFontScaling={false}>
        {longDate}
      </Text>
    </View>
  );
}

// The date only changes once a day, so skip re-rendering on every clock tick.
export const DateLine = memo(
  DateLineComponent,
  (prev, next) =>
    prev.size === next.size &&
    prev.align === next.align &&
    prev.date.toDateString() === next.date.toDateString(),
);

const styles = StyleSheet.create({
  weekday: {
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
  },
  date: {
    fontFamily: fonts.light,
  },
});
