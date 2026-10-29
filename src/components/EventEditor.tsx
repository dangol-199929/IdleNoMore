import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { listCalendars } from '../services/calendar';
import { spacing, type, useTheme } from '../theme';
import type { CalendarSummary, NewEvent } from '../types/calendar';
import { formatRelativeDay, formatTime24 } from '../utils/time';

type Duration = 30 | 60 | 120 | 'allDay';
const DURATIONS: { value: Duration; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 120, label: '2 h' },
  { value: 'allDay', label: 'All day' },
];

interface EventEditorProps {
  visible: boolean;
  onSave: (event: NewEvent) => Promise<string | null>;
  onClose: () => void;
}

function nextHalfHour(): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() < 30 ? 30 : 60, 0, 0);
  return date;
}

/**
 * Quick "new event" form. The event is written straight to the chosen phone
 * calendar; for a Google calendar, Android syncs it to Google as usual.
 */
export function EventEditor({ visible, onSave, onClose }: EventEditorProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {visible ? <Form onSave={onSave} onClose={onClose} /> : null}
    </Modal>
  );
}

function Form({ onSave, onClose }: Omit<EventEditorProps, 'visible'>) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState(nextHalfHour);
  const [duration, setDuration] = useState<Duration>(60);
  const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCalendars()
      .then((all) => {
        if (cancelled) return;
        const writable = all.filter((c) => c.writable);
        setCalendars(writable);
        // Prefer the account's main calendar (usually the Google one).
        const preferred = writable.find((c) => c.isPrimary) ?? writable[0];
        setCalendarId(preferred?.id ?? null);
        if (writable.length === 0) {
          setError('No calendar on this phone accepts new events. Add a Google account first.');
        }
      })
      .catch((e) => !cancelled && setError(`Calendars could not be listed (${String(e)}).`));
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const dayLabel = formatRelativeDay(start, now);
  const calendar = calendars.find((c) => c.id === calendarId) ?? null;
  const canSave = title.trim().length > 0 && calendar !== null && !saving;

  const setDay = (offset: number) => {
    const next = new Date(start);
    next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    setStart(next);
  };

  const pick = (mode: 'date' | 'time') =>
    DateTimePickerAndroid.open({
      value: start,
      mode,
      is24Hour: true,
      onChange: (event, value) => {
        if (event.type !== 'set' || !value) return;
        const next = new Date(start);
        if (mode === 'date')
          next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
        else next.setHours(value.getHours(), value.getMinutes(), 0, 0);
        setStart(next);
      },
    });

  const cycleCalendar = () => {
    if (calendars.length < 2) return;
    const index = calendars.findIndex((c) => c.id === calendarId);
    setCalendarId(calendars[(index + 1) % calendars.length].id);
  };

  const save = async () => {
    if (!canSave || !calendar) return;
    setSaving(true);
    setError(null);
    const allDay = duration === 'allDay';
    const end = allDay ? start : new Date(start.getTime() + (duration as number) * 60000);
    const message = await onSave({
      calendarId: calendar.id,
      title: title.trim(),
      start,
      end,
      allDay,
      location: location.trim() || null,
    });
    setSaving(false);
    if (message) setError(message);
    else onClose();
  };

  const chip = (label: string, selected: boolean, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? colors.accent : colors.faint, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[type.body, { color: selected ? colors.accent : colors.muted }]}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior="height" style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cancel" />
      <View
        style={[styles.panel, { backgroundColor: colors.background, borderColor: colors.divider }]}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={[type.kicker, { color: colors.accent, marginBottom: spacing.sm }]}>
            NEW EVENT
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor={colors.faint}
            autoFocus
            maxLength={200}
            style={[styles.title, { color: colors.text, borderBottomColor: colors.divider }]}
          />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Location (optional)"
            placeholderTextColor={colors.faint}
            maxLength={200}
            style={[styles.input, { color: colors.muted, borderBottomColor: colors.divider }]}
          />

          <View style={styles.row}>
            {chip('Today', dayLabel === 'Today', () => setDay(0))}
            {chip('Tomorrow', dayLabel === 'Tomorrow', () => setDay(1))}
            {chip(
              dayLabel === 'Today' || dayLabel === 'Tomorrow' ? 'Other day…' : dayLabel,
              dayLabel !== 'Today' && dayLabel !== 'Tomorrow',
              () => pick('date'),
              'other',
            )}
            {duration !== 'allDay'
              ? chip(formatTime24(start), true, () => pick('time'), 'time')
              : null}
          </View>
          <View style={styles.row}>
            {DURATIONS.map((d) => chip(d.label, duration === d.value, () => setDuration(d.value)))}
          </View>

          <Pressable
            onPress={cycleCalendar}
            accessibilityRole="button"
            accessibilityLabel={`Calendar: ${calendar?.title ?? 'none'}. Tap to change.`}
            style={styles.calendarRow}
          >
            <View style={[styles.dot, { backgroundColor: calendar?.color ?? colors.faint }]} />
            <Text style={[type.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              {calendar ? calendar.title : 'No calendar'}
              {calendar?.account ? (
                <Text style={{ color: colors.faint }}>{`  ${calendar.account}`}</Text>
              ) : null}
            </Text>
            {calendars.length > 1 ? (
              <Text style={[type.caption, { color: colors.accent }]}>Change</Text>
            ) : null}
          </Pressable>

          {error ? (
            <Text style={[type.caption, { color: colors.warning, marginTop: spacing.sm }]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.faint, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[type.button, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.accent, opacity: !canSave ? 0.35 : pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[type.button, { color: colors.accent }]}>
              {saving ? 'Adding…' : 'Add event'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '95%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  title: {
    ...type.heading,
    fontSize: 22,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...type.body,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    marginTop: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
