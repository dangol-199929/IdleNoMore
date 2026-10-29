import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { MIN_BRIGHTNESS } from '../../services/brightness';
import {
  ACCENT_OPTIONS,
  DAY_THEMES,
  NIGHT_THEMES,
  spacing,
  themePreview,
  type,
  useTheme,
} from '../../theme';
import type { AccentChoice, DayTheme, ModeOverride, NightTheme } from '../../types/settings';
import { formatMinuteOfDay } from '../../utils/time';
import { Section, SegmentedRow, StepperRow, TextButton, ThemeSwatches } from '../SettingsControls';

const MINUTES_PER_DAY = 24 * 60;
export const TIME_STEP = 15;

export function stepTime(minutes: number, delta: number): number {
  return (minutes + delta + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// Finer steps at the dim end, where small changes are most visible.
function stepBrightness(level: number, direction: 1 | -1): number {
  const step = level < 0.1 || (level === 0.1 && direction === -1) ? 0.01 : 0.05;
  const next = Math.round((level + step * direction) * 100) / 100;
  return Math.min(1, Math.max(MIN_BRIGHTNESS, next));
}

const percent = (level: number) => `${Math.round(level * 100)}%`;
const onOff = [
  { value: 'on' as const, label: 'On' },
  { value: 'off' as const, label: 'Off' },
];

/** Themes, colours, day/night schedule and brightness. */
export function DisplaySection({ onPreviewNight }: { onPreviewNight: () => void }) {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();

  return (
    <>
      <Section title="Look">
        <ThemeSwatches<DayTheme>
          label="Daytime theme"
          hint="Black turns OLED pixels fully off: darkest, and kindest to the battery"
          value={settings.dayTheme}
          options={DAY_THEMES.map((t) => ({ ...t, preview: themePreview(t.value) }))}
          onChange={(dayTheme) => updateSettings({ dayTheme })}
        />
        <View style={[styles.block, { borderBottomColor: colors.divider }]}>
          <Text style={[type.body, { color: colors.text }]}>Accent colour</Text>
          <Text style={[type.caption, { color: colors.faint }]}>
            Used sparingly for highlights. Night mode keeps its own dim colour.
          </Text>
          <View style={styles.accents}>
            {ACCENT_OPTIONS.map((option) => {
              const selected = settings.accent === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => updateSettings({ accent: option.value as AccentChoice })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.label} accent`}
                  style={styles.accentItem}
                >
                  <View
                    style={[
                      styles.accentDot,
                      {
                        backgroundColor: option.value === 'theme' ? 'transparent' : option.color,
                        borderColor: selected ? colors.text : colors.divider,
                        borderWidth: selected ? 2 : option.value === 'theme' ? 1 : 0,
                      },
                    ]}
                  />
                  <Text style={[type.caption, { color: selected ? colors.text : colors.muted }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <ThemeSwatches<NightTheme>
          label="Night colour"
          hint="Red is gentlest on the eyes in a dark bedroom"
          value={settings.nightTheme}
          options={NIGHT_THEMES.map((t) => ({ ...t, preview: themePreview(`night-${t.value}`) }))}
          onChange={(nightTheme) => updateSettings({ nightTheme })}
        />
      </Section>

      <Section title="Day and night">
        <SegmentedRow<ModeOverride>
          label="Mode"
          hint={settings.override === 'auto' ? 'Follows the schedule below' : 'Manual override'}
          value={settings.override}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'day', label: 'Day' },
            { value: 'night', label: 'Night' },
          ]}
          onChange={(override) => updateSettings({ override })}
        />
        <StepperRow
          label="Day starts"
          value={formatMinuteOfDay(settings.dayStart)}
          onDecrease={() => updateSettings({ dayStart: stepTime(settings.dayStart, -TIME_STEP) })}
          onIncrease={() => updateSettings({ dayStart: stepTime(settings.dayStart, TIME_STEP) })}
        />
        <StepperRow
          label="Night starts"
          value={formatMinuteOfDay(settings.nightStart)}
          onDecrease={() =>
            updateSettings({ nightStart: stepTime(settings.nightStart, -TIME_STEP) })
          }
          onIncrease={() =>
            updateSettings({ nightStart: stepTime(settings.nightStart, TIME_STEP) })
          }
        />
        <StepperRow
          label="Day brightness"
          value={percent(settings.dayBrightness)}
          canDecrease={settings.dayBrightness > MIN_BRIGHTNESS}
          canIncrease={settings.dayBrightness < 1}
          onDecrease={() =>
            updateSettings({ dayBrightness: stepBrightness(settings.dayBrightness, -1) })
          }
          onIncrease={() =>
            updateSettings({ dayBrightness: stepBrightness(settings.dayBrightness, 1) })
          }
        />
        <StepperRow
          label="Night brightness"
          hint="Try the preview on the phone itself"
          value={percent(settings.nightBrightness)}
          canDecrease={settings.nightBrightness > MIN_BRIGHTNESS}
          canIncrease={settings.nightBrightness < 1}
          onDecrease={() =>
            updateSettings({ nightBrightness: stepBrightness(settings.nightBrightness, -1) })
          }
          onIncrease={() =>
            updateSettings({ nightBrightness: stepBrightness(settings.nightBrightness, 1) })
          }
        />
        <TextButton label="Preview night mode" onPress={onPreviewNight} />
      </Section>

      <Section title="On screen">
        <SegmentedRow<'on' | 'off'>
          label="Page dots"
          value={settings.showPageDots ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ showPageDots: v === 'on' })}
        />
        <SegmentedRow<'on' | 'off'>
          label="Navigation strip"
          hint="Page names along the bottom, for tapping instead of swiping"
          value={settings.showNavStrip ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ showNavStrip: v === 'on' })}
        />
        <SegmentedRow<'on' | 'off'>
          label="Burn-in protection"
          hint="Shifts the clock a few pixels every 3 minutes"
          value={settings.burnInShift ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ burnInShift: v === 'on' })}
        />
        <Text style={[type.caption, styles.note, { color: colors.faint }]}>
          Pages always slide horizontally; Android’s pager doesn’t offer other transition styles.
        </Text>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  accentItem: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 56,
    minHeight: 56,
  },
  accentDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  note: {
    marginTop: spacing.sm,
  },
});
