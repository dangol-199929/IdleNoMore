import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../hooks/useSettings';
import { clockFonts, fonts, useTheme } from '../theme';
import { formatSeconds, formatTime12, formatTime24 } from '../utils/time';

interface ClockProps {
  date: Date;
  /** Space available for the clock; the digits scale to fill it. */
  width: number;
  height: number;
}

// Fraction of the main font size used for seconds and the AM/PM marker.
const SMALL_SCALE = 0.22;

/** The big clock, in the format, font and options chosen in Settings › Clock. */
function ClockComponent({ date, width, height }: ClockProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const font = clockFonts[settings.clockFont];

  const twelveHour = settings.clockFormat === '12h';
  const { time, period } = twelveHour
    ? formatTime12(date)
    : { time: formatTime24(date), period: null };

  // Width of the time string in ems, plus room for the small seconds/AM-PM column.
  const digits = time.replace(':', '').length;
  const timeEm = digits * font.digitEm + font.colonEm;
  const sideEm = settings.showSeconds || period ? SMALL_SCALE * 1.6 : 0;
  const fontSize = Math.floor(Math.min(width / (timeEm + sideEm), height));
  const small = Math.round(fontSize * SMALL_SCALE);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`The time is ${time}${period ? ` ${period}` : ''}`}
    >
      <Text
        style={[
          styles.time,
          {
            color: colors.text,
            fontFamily: font.family,
            letterSpacing: font.letterSpacing,
            fontSize,
            lineHeight: Math.round(fontSize * 1.15),
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        allowFontScaling={false}
      >
        {time}
      </Text>
      {settings.showSeconds || period ? (
        <View style={[styles.side, { marginBottom: Math.round(fontSize * 0.2) }]}>
          {period ? (
            <Text style={[styles.small, { color: colors.muted, fontSize: small }]}>{period}</Text>
          ) : null}
          {settings.showSeconds ? (
            <Text style={[styles.small, { color: colors.faint, fontSize: small }]}>
              {formatSeconds(date)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const Clock = memo(ClockComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  time: {
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  side: {
    marginLeft: 8,
  },
  small: {
    fontFamily: fonts.light,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
});
