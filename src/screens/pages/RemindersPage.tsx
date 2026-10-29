import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RemindersApi } from '../../hooks/useReminders';
import { fonts, spacing, useTheme } from '../../theme';
import type { Reminder } from '../../types/reminder';
import { formatDueDate } from '../../utils/time';

interface RemindersPageProps {
  now: Date;
  reminders: RemindersApi;
  isLandscape: boolean;
  onAdd: () => void;
  onEdit: (reminder: Reminder) => void;
}

export function RemindersPage({ now, reminders, isLandscape, onAdd, onEdit }: RemindersPageProps) {
  const { colors } = useTheme();
  const open = reminders.reminders.filter((r) => !r.completedAt);
  const done = reminders.reminders.filter((r) => r.completedAt);
  const overdue = open.filter((r) => r.dueAt <= now).length;

  const summary =
    open.length === 0
      ? 'All clear'
      : `${open.length} open${overdue > 0 ? ` · ${overdue} overdue` : ''}`;

  return (
    <View style={[styles.page, isLandscape && styles.pageLandscape]}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <Text style={[styles.kicker, { color: colors.accent }]}>REMINDERS</Text>
        <Text style={[styles.summary, { color: colors.text }]}>{summary}</Text>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.add,
            { borderColor: colors.accent, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.addText, { color: colors.accent }]}>+ Add reminder</Text>
        </Pressable>
        {reminders.notificationPermission === 'denied' ? (
          <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
            <Text style={[styles.note, { color: colors.muted }]}>
              Notifications are off, so reminders only appear here. Tap to open settings.
            </Text>
          </Pressable>
        ) : null}
        {reminders.error ? (
          <Text style={[styles.note, { color: colors.warning }]}>{reminders.error}</Text>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {reminders.status === 'loading' ? (
          <Text style={[styles.empty, { color: colors.faint }]}>Loading…</Text>
        ) : open.length === 0 && done.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>
            Add a reminder and it will show here, on the clock, and as a notification when it is
            due. Everything stays on this phone.
          </Text>
        ) : null}
        {open.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            now={now}
            onToggle={() => reminders.setCompleted(reminder, true)}
            onPress={() => onEdit(reminder)}
          />
        ))}
        {done.length > 0 ? (
          <Text style={[styles.doneHeading, { color: colors.faint }]}>DONE TODAY</Text>
        ) : null}
        {done.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            now={now}
            onToggle={() => reminders.setCompleted(reminder, false)}
            onPress={() => onEdit(reminder)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ReminderCard({
  reminder,
  now,
  onToggle,
  onPress,
}: {
  reminder: Reminder;
  now: Date;
  onToggle: () => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const completed = reminder.completedAt !== null;
  const overdue = !completed && reminder.dueAt <= now;
  const due = formatDueDate(reminder.dueAt, now);

  return (
    <View
      style={[styles.card, { borderBottomColor: colors.divider, opacity: completed ? 0.45 : 1 }]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={
          completed ? `Mark ${reminder.title} as not done` : `Complete ${reminder.title}`
        }
        hitSlop={8}
        style={styles.checkTarget}
      >
        <View
          style={[
            styles.check,
            {
              borderColor: overdue ? colors.warning : colors.muted,
              backgroundColor: completed ? colors.muted : 'transparent',
            },
          ]}
        >
          {completed ? <Text style={[styles.tick, { color: colors.background }]}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${reminder.title}, ${overdue ? 'overdue, ' : ''}${due}. Tap to edit.`}
        style={({ pressed }) => [styles.cardBody, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text
          style={[
            styles.title,
            { color: colors.text },
            completed && { textDecorationLine: 'line-through' },
          ]}
          numberOfLines={2}
        >
          {reminder.title}
        </Text>
        <Text style={[styles.meta, { color: overdue ? colors.warning : colors.muted }]}>
          {overdue ? `Overdue · ${due}` : due}
        </Text>
        {reminder.notes ? (
          <Text style={[styles.notes, { color: colors.faint }]} numberOfLines={1}>
            {reminder.notes}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  pageLandscape: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerLandscape: {
    width: '34%',
    marginBottom: 0,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  summary: {
    fontFamily: fonts.light,
    fontSize: 28,
  },
  add: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  addText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 480,
    marginTop: spacing.lg,
  },
  doneHeading: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkTarget: {
    width: 56,
    height: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: fonts.regular,
    fontSize: 20,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  notes: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
});
