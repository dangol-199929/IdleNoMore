import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { clockFonts, spacing, type, useTheme } from '../../theme';
import type {
  ClockAlign,
  ClockFont,
  ClockFormat,
  ClockScale,
  HomeLayout,
  WeekdayStyle,
} from '../../types/settings';
import { Section, SegmentedRow } from '../SettingsControls';

const onOff = [
  { value: 'on' as const, label: 'On' },
  { value: 'off' as const, label: 'Off' },
];

/** Clock format, font, size and the Clock page preset. */
export function ClockSection() {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();

  return (
    <>
      <Section title="Clock page">
        <SegmentedRow<HomeLayout>
          label="Layout"
          hint={
            settings.homeLayout === 'productivity'
              ? 'Clock with today’s agenda and reminders'
              : settings.homeLayout === 'minimal'
                ? 'Just an enormous clock and the date'
                : 'Clock over your photos (add them on the Photos page)'
          }
          value={settings.homeLayout}
          options={[
            { value: 'productivity', label: 'Agenda' },
            { value: 'minimal', label: 'Minimal' },
            { value: 'photo', label: 'Photo' },
          ]}
          onChange={(homeLayout) => updateSettings({ homeLayout })}
        />
        <SegmentedRow<'on' | 'off'>
          label="Battery percentage"
          value={settings.showBattery ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ showBattery: v === 'on' })}
        />
      </Section>

      <Section title="Time">
        <SegmentedRow<ClockFormat>
          label="Format"
          value={settings.clockFormat}
          options={[
            { value: '24h', label: '24-hour' },
            { value: '12h', label: '12-hour' },
          ]}
          onChange={(clockFormat) => updateSettings({ clockFormat })}
        />
        <SegmentedRow<'on' | 'off'>
          label="Seconds"
          value={settings.showSeconds ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ showSeconds: v === 'on' })}
        />
        <View style={[styles.block, { borderBottomColor: colors.divider }]}>
          <Text style={[type.body, { color: colors.text }]}>Font</Text>
          <View style={styles.fonts}>
            {(Object.keys(clockFonts) as ClockFont[]).map((key) => {
              const font = clockFonts[key];
              const selected = settings.clockFont === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => updateSettings({ clockFont: key })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${font.label} clock font`}
                  style={[
                    styles.fontOption,
                    {
                      borderColor: selected ? colors.accent : colors.divider,
                      borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: font.family,
                      fontSize: 34,
                      color: colors.text,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    12:30
                  </Text>
                  <Text style={[type.caption, { color: selected ? colors.text : colors.muted }]}>
                    {font.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <SegmentedRow<ClockScale>
          label="Size"
          value={settings.clockScale}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
          onChange={(clockScale) => updateSettings({ clockScale })}
        />
        <SegmentedRow<ClockAlign>
          label="Alignment"
          value={settings.clockAlign}
          options={[
            { value: 'center', label: 'Centre' },
            { value: 'left', label: 'Left' },
          ]}
          onChange={(clockAlign) => updateSettings({ clockAlign })}
        />
      </Section>

      <Section title="Date">
        <SegmentedRow<'on' | 'off'>
          label="Show date"
          value={settings.showDate ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ showDate: v === 'on' })}
        />
        <SegmentedRow<WeekdayStyle>
          label="Weekday"
          value={settings.weekdayStyle}
          options={[
            { value: 'long', label: 'Thursday' },
            { value: 'short', label: 'Thu' },
            { value: 'none', label: 'Hide' },
          ]}
          onChange={(weekdayStyle) => updateSettings({ weekdayStyle })}
        />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fonts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  fontOption: {
    minWidth: 120,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
});
