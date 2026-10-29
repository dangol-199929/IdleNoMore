import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, type, useTheme } from '../../theme';
import type { Reminder } from '../../types/reminder';
import { formatDueDate } from '../../utils/time';
import { EmptyText, IconButton, WidgetHeader } from '../ui';

interface RemindersWidgetProps {
  reminders: Reminder[];
  now: Date;
  limit: number;
  onSelect: (reminder: Reminder) => void;
  onComplete: (reminder: Reminder) => void;
  onAdd: () => void;
  onOpenReminders: () => void;
}

/** The next few open reminders, with a one-tap complete. */
export function RemindersWidget({
  reminders,
  now,
  limit,
  onSelect,
  onComplete,
  onAdd,
  onOpenReminders,
}: RemindersWidgetProps) {
  const { colors } = useTheme();
  const open = reminders.filter((r) => !r.completedAt);
  const shown = open.slice(0, limit);
  const more = open.length - shown.length;

  return (
    <View>
      <View style={styles.header}>
        <WidgetHeader
          title="Reminders"
          detail={more > 0 ? `+${more} more` : undefined}
          onPress={onOpenReminders}
          accessibilityLabel="Open reminders"
        />
        <View style={styles.add}>
          <IconButton icon="plus" onPress={onAdd} accessibilityLabel="Add reminder" size={20} />
        </View>
      </View>
      {shown.length === 0 ? (
        <EmptyText>No reminders</EmptyText>
      ) : (
        shown.map((reminder) => {
          const overdue = reminder.dueAt <= now;
          const due = formatDueDate(reminder.dueAt, now);
          return (
            <View key={reminder.id} style={styles.row}>
              <Pressable
                onPress={() => onComplete(reminder)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: false }}
                accessibilityLabel={`Complete ${reminder.title}`}
                style={styles.check}
              >
                <Feather name="circle" size={22} color={overdue ? colors.warning : colors.muted} />
              </Pressable>
              <Pressable
                onPress={() => onSelect(reminder)}
                accessibilityRole="button"
                accessibilityLabel={`${reminder.title}, ${overdue ? 'overdue, ' : ''}${due}`}
                style={({ pressed }) => [styles.text, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[type.heading, { color: colors.text }]} numberOfLines={1}>
                  {reminder.title}
                </Text>
                <Text style={[type.caption, { color: overdue ? colors.warning : colors.faint }]}>
                  {overdue ? `Overdue · ${due}` : due}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    justifyContent: 'center',
    minHeight: 48,
  },
  add: {
    position: 'absolute',
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  // Same width as the agenda's time column, so titles line up across widgets.
  check: {
    width: 80,
    height: 48,
    justifyContent: 'center',
    marginLeft: -2,
  },
  text: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
});
