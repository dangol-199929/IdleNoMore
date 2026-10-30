import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StepperRow } from '../../components/SettingsControls';
import { spacing, type, useTheme } from '../../theme';
import { formatMinuteOfDay } from '../../utils/time';
import { getApiKey } from '../apiKey';
import { findPlaces } from '../transportApi';
import { TransportError, type CommuteSchedule, type Place } from '../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Show Monday first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function newSchedule(): CommuteSchedule {
  return {
    id: String(Date.now()),
    name: 'Work',
    enabled: true,
    days: [1, 2, 3, 4, 5],
    origin: null,
    destination: null,
    arriveBy: 9 * 60,
    walkToStart: 10,
    walkFromEnd: 5,
    buffer: 5,
  };
}

/** Create or edit one weekly commute schedule. */
export function ScheduleEditor({
  schedule,
  onSave,
  onClose,
}: {
  schedule: CommuteSchedule | null;
  onSave: (schedule: CommuteSchedule) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={schedule !== null}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {schedule ? (
        <Form key={schedule.id} initial={schedule} onSave={onSave} onClose={onClose} />
      ) : null}
    </Modal>
  );
}

function Form({
  initial,
  onSave,
  onClose,
}: {
  initial: CommuteSchedule;
  onSave: (schedule: CommuteSchedule) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(initial);
  const set = (changes: Partial<CommuteSchedule>) => setDraft((d) => ({ ...d, ...changes }));
  const canSave = draft.name.trim().length > 0 && draft.origin && draft.destination;

  const toggleDay = (day: number) =>
    set({
      days: draft.days.includes(day)
        ? draft.days.filter((d) => d !== day)
        : [...draft.days, day].sort(),
    });

  const pickTime = () => {
    const value = new Date();
    value.setHours(Math.floor(draft.arriveBy / 60), draft.arriveBy % 60, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) {
          set({ arriveBy: picked.getHours() * 60 + picked.getMinutes() });
        }
      },
    });
  };

  const minutes = (key: 'walkToStart' | 'walkFromEnd' | 'buffer', label: string, hint?: string) => (
    <StepperRow
      label={label}
      hint={hint}
      value={`${draft[key]} min`}
      canDecrease={draft[key] > 0}
      canIncrease={draft[key] < 120}
      onDecrease={() => set({ [key]: Math.max(0, draft[key] - (draft[key] > 20 ? 5 : 1)) })}
      onIncrease={() => set({ [key]: Math.min(120, draft[key] + (draft[key] >= 20 ? 5 : 1)) })}
    />
  );

  return (
    <KeyboardAvoidingView
      behavior="height"
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[type.title, styles.flex, { color: colors.text }]}>Commute schedule</Text>
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.headerButton}>
          <Text style={[type.button, { color: colors.muted }]}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => canSave && onSave({ ...draft, name: draft.name.trim() })}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          style={[styles.headerButton, { opacity: canSave ? 1 : 0.35 }]}
        >
          <Text style={[type.button, { color: colors.accent }]}>Save</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={draft.name}
          onChangeText={(name) => set({ name })}
          placeholder="Name, e.g. Work"
          placeholderTextColor={colors.faint}
          maxLength={40}
          style={[styles.input, { color: colors.text, borderBottomColor: colors.divider }]}
        />

        <Text style={[type.kicker, styles.label, { color: colors.accent }]}>DAYS</Text>
        <View style={styles.days}>
          {DAY_ORDER.map((day) => {
            const on = draft.days.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={DAY_NAMES[day]}
                style={[
                  styles.day,
                  { borderColor: on ? colors.accent : colors.divider },
                  on && { backgroundColor: colors.divider },
                ]}
              >
                <Text style={[type.body, { color: on ? colors.accent : colors.muted }]}>
                  {DAY_LABELS[day]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[type.caption, { color: colors.faint }]}>
          {draft.days.length === 0
            ? 'No days chosen: used as the default on any day without its own schedule.'
            : 'Days are Sydney time.'}
        </Text>

        <PlaceField label="FROM" value={draft.origin} onChange={(origin) => set({ origin })} />
        <PlaceField
          label="TO"
          value={draft.destination}
          onChange={(destination) => set({ destination })}
        />

        <Text style={[type.kicker, styles.label, { color: colors.accent }]}>TIMING</Text>
        <Pressable onPress={pickTime} accessibilityRole="button" style={styles.timeRow}>
          <Text style={[type.body, styles.flex, { color: colors.text }]}>Arrive at work by</Text>
          <Text style={[type.heading, { color: colors.accent }]}>
            {formatMinuteOfDay(draft.arriveBy)}
          </Text>
        </Pressable>
        {minutes('walkToStart', 'Home to first stop', 'Walking and getting out the door')}
        {minutes('walkFromEnd', 'Last stop to work', 'Walk at the other end')}
        {minutes('buffer', 'Safety buffer', 'Aim to arrive this much early')}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Search box for a station, stop or address, backed by the TfNSW stop finder. */
function PlaceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Search a moment after typing stops, to avoid a request per keystroke.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await findPlaces(text, await getApiKey());
        if (cancelled) return;
        setResults(found);
        setMessage(found.length === 0 ? 'No matches.' : null);
      } catch (e) {
        if (!cancelled) setMessage(e instanceof TransportError ? e.message : String(e));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View>
      <Text style={[type.kicker, styles.label, { color: colors.accent }]}>{label}</Text>
      {value ? (
        <View style={styles.chosen}>
          <Text style={[type.body, styles.flex, { color: colors.text }]}>{value.name}</Text>
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            style={styles.headerButton}
          >
            <Text style={[type.button, { color: colors.muted }]}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search station, stop or address"
              placeholderTextColor={colors.faint}
              style={[
                styles.input,
                styles.flex,
                { color: colors.text, borderBottomColor: colors.divider },
              ]}
            />
            {searching ? <ActivityIndicator color={colors.muted} /> : null}
          </View>
          {message ? (
            <Text style={[type.caption, { color: colors.warning }]}>{message}</Text>
          ) : null}
          {(query.trim().length >= 3 ? results : []).map((place) => (
            <Pressable
              key={place.id}
              onPress={() => {
                onChange(place);
                setQuery('');
                setResults([]);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.result, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[type.body, { color: colors.text }]}>{place.name}</Text>
              <Text style={[type.caption, { color: colors.faint }]}>{place.kind}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxWidth: 720,
  },
  input: {
    ...type.body,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  days: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  day: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  result: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
});
