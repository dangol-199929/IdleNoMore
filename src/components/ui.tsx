import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { TOUCH_TARGET, spacing, type, useTheme } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Small uppercase label that opens a section or widget, e.g. "TODAY". */
export function Kicker({ children, color }: { children: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[type.kicker, { color: color ?? colors.accent }]}>{children.toUpperCase()}</Text>
  );
}

/** Kicker plus an optional trailing detail or action, used at the top of widgets. */
export function WidgetHeader({
  title,
  detail,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={styles.widgetHeader}>
      <Kicker>{title}</Kicker>
      {detail ? <Text style={[type.caption, { color: colors.faint }]}>{detail}</Text> : null}
      {onPress ? <Feather name="chevron-right" size={16} color={colors.faint} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Open ${title}`}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

/** Rounded outline button. 'accent' for the main action on a screen, 'quiet' otherwise. */
export function PillButton({
  label,
  onPress,
  icon,
  variant = 'quiet',
  disabled,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'accent' | 'quiet' | 'warning';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const tint =
    variant === 'accent' ? colors.accent : variant === 'warning' ? colors.warning : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.pill,
        {
          borderColor: variant === 'quiet' ? colors.faint : tint,
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={tint} /> : null}
      <Text style={[type.button, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

/** Icon-only button with a full-size touch target. Always give it a label. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Feather name={icon} size={size} color={color ?? colors.faint} />
    </Pressable>
  );
}

/** Small dots showing which desk page is on screen. */
export function PageDots({ count, index }: { count: number; index: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dots} accessible accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === index
              ? { backgroundColor: colors.muted, width: 14 }
              : { backgroundColor: colors.faint },
          ]}
        />
      ))}
    </View>
  );
}

/** Placeholder text for empty widgets and lists. */
export function EmptyText({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[type.body, { color: colors.faint }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: TOUCH_TARGET / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
