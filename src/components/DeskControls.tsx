import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ModeOverride } from '../types/settings';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { fonts, spacing, useTheme } from '../theme';

interface DeskControlsProps {
  visible: boolean;
  override: ModeOverride;
  onCycleOverride: () => void;
  onOpenSettings: () => void;
  /** Shown when something needs the user's attention, e.g. brightness unavailable. */
  message?: string | null;
  bottomInset: number;
}

const OVERRIDE_LABELS: Record<ModeOverride, string> = {
  auto: 'Mode · Auto',
  day: 'Mode · Day',
  night: 'Mode · Night',
};

/** Quiet control strip along the bottom edge, faded in when the screen is tapped. */
export function DeskControls({
  visible,
  override,
  onCycleOverride,
  onOpenSettings,
  message,
  bottomInset,
}: DeskControlsProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: reducedMotion ? 0 : 220,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity, reducedMotion]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.container,
        {
          opacity,
          paddingBottom: bottomInset + spacing.md,
          // Opaque so the controls never sit on top of agenda text.
          backgroundColor: colors.background,
        },
      ]}
    >
      {message ? <Text style={[styles.message, { color: colors.muted }]}>{message}</Text> : null}
      <View style={styles.row}>
        <ControlButton label={OVERRIDE_LABELS[override]} onPress={onCycleOverride} />
        <ControlButton label="Settings" onPress={onOpenSettings} />
      </View>
    </Animated.View>
  );
}

function ControlButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.faint, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
});
