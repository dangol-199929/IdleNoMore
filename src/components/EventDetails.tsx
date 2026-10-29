import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, useTheme } from '../theme';
import type { AgendaEvent } from '../types/calendar';
import { formatLongDate, formatTimeRange } from '../utils/time';

interface EventDetailsProps {
  event: AgendaEvent | null;
  onClose: () => void;
}

/** Read-only details for one event, with a hand-off to the phone's calendar app. */
export function EventDetails({ event, onClose }: EventDetailsProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={event !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close event details">
        {event ? (
          <Pressable
            style={[
              styles.panel,
              { backgroundColor: colors.background, borderColor: colors.divider },
            ]}
            // Swallow taps inside the panel so they don't close it.
            onPress={() => {}}
          >
            <ScrollView>
              <View style={styles.titleRow}>
                <View style={[styles.dot, { backgroundColor: event.color ?? colors.accent }]} />
                <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
              </View>
              <Text style={[styles.line, { color: colors.text }]}>
                {formatTimeRange(event.start, event.end, event.allDay)}
              </Text>
              <Text style={[styles.line, { color: colors.muted }]}>
                {formatLongDate(event.start)}
              </Text>
              {event.location ? (
                <Text style={[styles.line, { color: colors.muted }]}>{event.location}</Text>
              ) : null}
              {event.calendarTitle ? (
                <Text style={[styles.small, { color: colors.faint }]}>{event.calendarTitle}</Text>
              ) : null}
              {event.notes ? (
                <Text style={[styles.notes, { color: colors.muted }]} numberOfLines={12}>
                  {event.notes
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+\n/g, '\n')
                    .trim()}
                </Text>
              ) : null}
            </ScrollView>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  event.open().catch(() => {});
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.action,
                  { borderColor: colors.faint, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.actionText, { color: colors.muted }]}>Open in Calendar</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.action,
                  { borderColor: colors.accent, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.actionText, { color: colors.accent }]}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
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
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 22,
  },
  line: {
    fontFamily: fonts.regular,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  notes: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
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
  actionText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
