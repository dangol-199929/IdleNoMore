import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { spacing, type, useTheme } from '../../theme';
import { DASHBOARD_SLOTS, type DashboardLayout, type WidgetId } from '../../types/settings';
import { formatLongDate, formatTime24 } from '../../utils/time';
import { Section, SegmentedRow } from '../SettingsControls';
import { IconButton, PillButton } from '../ui';

const WIDGET_OPTIONS: { id: WidgetId; label: string }[] = [
  { id: 'clock', label: 'Clock' },
  { id: 'date', label: 'Date' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'photo', label: 'Photo' },
  { id: 'battery', label: 'Battery' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'empty', label: 'Empty' },
];

const SLOT_NAMES: Record<DashboardLayout, string[]> = {
  feature: ['Large (left)', 'Top right', 'Bottom right'],
  quad: ['Top left', 'Top right', 'Bottom left', 'Bottom right'],
  columns: ['Left', 'Middle', 'Right'],
};

/** Arrangement and widgets for the Dashboard page, plus the countdown target. */
export function DashboardSection() {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();
  const layout = settings.dashboardLayout;
  const widgets = settings.dashboardWidgets;

  const cycle = (slot: number, delta: -1 | 1) => {
    const current = WIDGET_OPTIONS.findIndex((w) => w.id === widgets[slot]);
    const next = WIDGET_OPTIONS[(current + delta + WIDGET_OPTIONS.length) % WIDGET_OPTIONS.length];
    const updated = [...widgets];
    updated[slot] = next.id;
    updateSettings({ dashboardWidgets: updated });
  };

  const pickCountdown = () => {
    const start = new Date(settings.countdownAt ?? Date.now() + 7 * 86400000);
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, time) => {
            const when = new Date(date);
            if (timeEvent.type === 'set' && time) {
              when.setHours(time.getHours(), time.getMinutes(), 0, 0);
            } else {
              when.setHours(0, 0, 0, 0);
            }
            updateSettings({ countdownAt: when.getTime() });
          },
        });
      },
    });
  };

  return (
    <Section title="Dashboard">
      <SegmentedRow<DashboardLayout>
        label="Arrangement"
        value={layout}
        options={[
          { value: 'feature', label: 'Feature' },
          { value: 'quad', label: 'Grid' },
          { value: 'columns', label: 'Columns' },
        ]}
        onChange={(dashboardLayout) => updateSettings({ dashboardLayout })}
      />
      {Array.from({ length: DASHBOARD_SLOTS[layout] }, (_, slot) => {
        const label = WIDGET_OPTIONS.find((w) => w.id === widgets[slot])?.label ?? 'Empty';
        return (
          <View key={slot} style={[styles.row, { borderBottomColor: colors.divider }]}>
            <Text style={[type.body, styles.flex, { color: colors.text }]}>
              {SLOT_NAMES[layout][slot]}
            </Text>
            <IconButton
              icon="chevron-left"
              onPress={() => cycle(slot, -1)}
              accessibilityLabel={`Previous widget for ${SLOT_NAMES[layout][slot]}`}
              color={colors.muted}
            />
            <Text
              style={[type.body, styles.widget, { color: colors.accent }]}
              accessibilityLiveRegion="polite"
            >
              {label}
            </Text>
            <IconButton
              icon="chevron-right"
              onPress={() => cycle(slot, 1)}
              accessibilityLabel={`Next widget for ${SLOT_NAMES[layout][slot]}`}
              color={colors.muted}
            />
          </View>
        );
      })}

      <View style={[styles.countdown, { borderBottomColor: colors.divider }]}>
        <Text style={[type.body, { color: colors.text }]}>Countdown widget</Text>
        <TextInput
          value={settings.countdownLabel}
          onChangeText={(countdownLabel) => updateSettings({ countdownLabel })}
          placeholder="What are you counting down to?"
          placeholderTextColor={colors.faint}
          maxLength={60}
          style={[styles.input, { color: colors.text, borderBottomColor: colors.divider }]}
        />
        <View style={styles.countdownActions}>
          <PillButton
            label={
              settings.countdownAt
                ? `${formatLongDate(new Date(settings.countdownAt))} ${formatTime24(new Date(settings.countdownAt))}`
                : 'Choose date'
            }
            icon="calendar"
            onPress={pickCountdown}
          />
          {settings.countdownAt ? (
            <PillButton
              label="Clear"
              onPress={() => updateSettings({ countdownAt: null, countdownLabel: '' })}
            />
          ) : null}
        </View>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  widget: {
    minWidth: 96,
    textAlign: 'center',
  },
  countdown: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...type.body,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  countdownActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
