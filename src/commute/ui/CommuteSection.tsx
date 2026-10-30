import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';

import { Section, SegmentedRow } from '../../components/SettingsControls';
import { IconButton, PillButton } from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';
import { spacing, type, useTheme } from '../../theme';
import { formatMinuteOfDay } from '../../utils/time';
import { getApiKey, setApiKey } from '../apiKey';
import { findPlaces } from '../transportApi';
import { TransportError, type CommuteSchedule } from '../types';
import { ScheduleEditor, newSchedule } from './ScheduleEditor';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function describeDays(days: number[]): string {
  if (days.length === 0) return 'Default (any other day)';
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '0,6') return 'Weekends';
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => days.includes(d))
    .map((d) => SHORT_DAYS[d])
    .join(', ');
}

/** Settings › Commute: the TfNSW API key and weekly schedules. */
export function CommuteSection() {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();
  const schedules = settings.commuteSchedules;
  const [editing, setEditing] = useState<CommuteSchedule | null>(null);

  const save = (schedule: CommuteSchedule) => {
    const exists = schedules.some((s) => s.id === schedule.id);
    updateSettings({
      commuteSchedules: exists
        ? schedules.map((s) => (s.id === schedule.id ? schedule : s))
        : [...schedules, schedule],
    });
    setEditing(null);
  };
  const remove = (id: string) =>
    updateSettings({ commuteSchedules: schedules.filter((s) => s.id !== id) });
  const duplicate = (s: CommuteSchedule) =>
    setEditing({ ...s, id: String(Date.now()), name: `${s.name} copy` });
  const toggle = (s: CommuteSchedule) => save({ ...s, enabled: !s.enabled });

  return (
    <>
      <ApiKeySection />

      <Section title="Schedules">
        {schedules.length === 0 ? (
          <Text style={[type.body, { color: colors.muted }]}>
            Add your usual trip to work. You can create different schedules for different days.
          </Text>
        ) : null}
        {schedules.map((s) => (
          <View key={s.id} style={[styles.row, { borderBottomColor: colors.divider }]}>
            <View style={styles.flex}>
              <Text style={[type.body, { color: s.enabled ? colors.text : colors.faint }]}>
                {s.name} · arrive by {formatMinuteOfDay(s.arriveBy)}
              </Text>
              <Text style={[type.caption, { color: colors.faint }]} numberOfLines={1}>
                {describeDays(s.days)} · {s.origin?.name ?? 'no start'} →{' '}
                {s.destination?.name ?? 'no destination'}
              </Text>
            </View>
            <PillButton
              label={s.enabled ? 'On' : 'Off'}
              onPress={() => toggle(s)}
              variant={s.enabled ? 'accent' : 'quiet'}
              accessibilityLabel={`${s.enabled ? 'Disable' : 'Enable'} ${s.name}`}
            />
            <IconButton
              icon="edit-2"
              onPress={() => setEditing(s)}
              accessibilityLabel={`Edit ${s.name}`}
            />
            <IconButton
              icon="copy"
              onPress={() => duplicate(s)}
              accessibilityLabel={`Duplicate ${s.name}`}
            />
            <IconButton
              icon="trash-2"
              onPress={() => remove(s.id)}
              accessibilityLabel={`Delete ${s.name}`}
            />
          </View>
        ))}
        <PillButton
          label="Add schedule"
          icon="plus"
          variant="accent"
          onPress={() => setEditing(newSchedule())}
          style={styles.add}
        />
      </Section>

      <Section title="Display">
        <SegmentedRow<'on' | 'off'>
          label="Show on the Clock page"
          hint="In the 3 hours before you need to arrive"
          value={settings.commuteOnClock ? 'on' : 'off'}
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          onChange={(v) => updateSettings({ commuteOnClock: v === 'on' })}
        />
        <Text style={[type.caption, styles.note, { color: colors.faint }]}>
          The Commute page can be shown, hidden or reordered under Screens, and added to the
          Dashboard as a widget. Journeys refresh every 2 minutes only while a commute view is on
          screen during the commute window. Times are estimates from Transport for NSW, not
          guarantees; departure notifications are not part of this first version.
        </Text>
      </Section>

      <ScheduleEditor schedule={editing} onSave={save} onClose={() => setEditing(null)} />
    </>
  );
}

function ApiKeySection() {
  const { colors } = useTheme();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => setSaved(!!k));
  }, []);

  const save = async () => {
    await setApiKey(value);
    setValue('');
    setSaved(true);
    await test();
  };

  const test = async () => {
    setTesting(true);
    try {
      await findPlaces('Central Station', await getApiKey());
      setStatus({ ok: true, text: 'Connected to Transport for NSW.' });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof TransportError ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    await setApiKey(null);
    setSaved(false);
    setStatus(null);
  };

  return (
    <Section title="Transport for NSW">
      <Text style={[type.caption, { color: colors.muted }]}>
        Smart Commute uses your own free API key from the Transport for NSW Open Data Hub (create an
        application with the Trip Planner APIs). It’s stored encrypted on this phone only.
      </Text>
      <Text
        style={[type.caption, styles.link, { color: colors.accent }]}
        onPress={() => Linking.openURL('https://opendata.transport.nsw.gov.au')}
      >
        opendata.transport.nsw.gov.au
      </Text>
      {saved ? (
        <View style={styles.keyRow}>
          <Text style={[type.body, styles.flex, { color: colors.text }]}>API key saved</Text>
          <PillButton label={testing ? 'Testing…' : 'Test'} onPress={test} disabled={testing} />
          <PillButton label="Remove" onPress={remove} />
        </View>
      ) : (
        <View style={styles.keyRow}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Paste API key"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              styles.flex,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          />
          <PillButton label="Save" variant="accent" onPress={save} disabled={!value.trim()} />
        </View>
      )}
      {status ? (
        <Text style={[type.caption, { color: status.ok ? colors.muted : colors.warning }]}>
          {status.text}
        </Text>
      ) : null}
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
    minHeight: 64,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  add: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.sm,
  },
  link: {
    marginVertical: spacing.sm,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  input: {
    ...type.body,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
