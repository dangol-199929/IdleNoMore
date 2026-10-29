import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
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

import { fonts, spacing, useTheme } from '../theme';
import type { Reminder, ReminderDraft } from '../types/reminder';
import { formatRelativeDay, formatTime24 } from '../utils/time';

interface ReminderEditorProps {
  /** null = closed; 'new' = create; a reminder = edit. */
  target: Reminder | 'new' | null;
  onSave: (draft: ReminderDraft, id?: number) => void;
  onDelete: (reminder: Reminder) => void;
  onClose: () => void;
}

/** Next whole hour from now: a sensible default due time for a new reminder. */
function defaultDue(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

export function ReminderEditor({ target, onSave, onDelete, onClose }: ReminderEditorProps) {
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {target !== null ? (
        // Keyed so the form state resets for each reminder opened.
        <EditorForm
          key={target === 'new' ? 'new' : target.id}
          target={target}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function EditorForm({
  target,
  onSave,
  onDelete,
  onClose,
}: {
  target: Reminder | 'new';
  onSave: ReminderEditorProps['onSave'];
  onDelete: ReminderEditorProps['onDelete'];
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const existing = target === 'new' ? null : target;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [due, setDue] = useState<Date>(() => existing?.dueAt ?? defaultDue());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const now = new Date();
  const trimmed = title.trim();
  const inPast = due.getTime() <= now.getTime();

  const setDay = (offset: number) => {
    const next = new Date(due);
    const base = new Date();
    next.setFullYear(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    setDue(next);
  };

  const pick = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value: due,
      mode,
      is24Hour: true,
      onChange: (event, value) => {
        if (event.type !== 'set' || !value) return;
        const next = new Date(due);
        if (mode === 'date') {
          next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
        } else {
          next.setHours(value.getHours(), value.getMinutes(), 0, 0);
        }
        setDue(next);
      },
    });
  };

  const save = () => {
    if (!trimmed) return;
    onSave({ title: trimmed, notes: notes.trim() || null, dueAt: due }, existing?.id);
    onClose();
  };

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.accent : colors.faint,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.accent : colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );

  const dueLabel = formatRelativeDay(due, now);

  return (
    <KeyboardAvoidingView behavior="height" style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cancel" />
      <View
        style={[styles.panel, { backgroundColor: colors.background, borderColor: colors.divider }]}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={[styles.heading, { color: colors.accent }]}>
            {existing ? 'EDIT REMINDER' : 'NEW REMINDER'}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What do you need to remember?"
            placeholderTextColor={colors.faint}
            autoFocus={!existing}
            returnKeyType="done"
            maxLength={120}
            style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.divider }]}
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.faint}
            multiline
            maxLength={500}
            style={[styles.notesInput, { color: colors.muted, borderBottomColor: colors.divider }]}
          />

          <View style={styles.row}>
            {chip('Today', dueLabel === 'Today', () => setDay(0))}
            {chip('Tomorrow', dueLabel === 'Tomorrow', () => setDay(1))}
            {chip(
              dueLabel === 'Today' || dueLabel === 'Tomorrow' ? 'Other day…' : dueLabel,
              dueLabel !== 'Today' && dueLabel !== 'Tomorrow',
              () => pick('date'),
            )}
            {chip(formatTime24(due), true, () => pick('time'))}
          </View>
          {inPast ? (
            <Text style={[styles.warning, { color: colors.warning }]}>
              This time has already passed, so no notification will be sent.
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          {existing ? (
            <Pressable
              onPress={() => {
                if (confirmDelete) {
                  onDelete(existing);
                  onClose();
                } else {
                  setConfirmDelete(true);
                }
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                styles.deleteAction,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.warning }]}>
                {confirmDelete ? 'Tap again to delete' : 'Delete'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.faint, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={!trimmed}
            accessibilityRole="button"
            accessibilityState={{ disabled: !trimmed }}
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.accent, opacity: !trimmed ? 0.35 : pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: colors.accent }]}>Save</Text>
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
    maxWidth: 560,
    maxHeight: '95%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  heading: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  titleInput: {
    fontFamily: fonts.regular,
    fontSize: 22,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notesInput: {
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 96,
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
  chipText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  warning: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: spacing.sm,
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
  deleteAction: {
    borderColor: 'transparent',
    marginRight: 'auto',
  },
  actionText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
