import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, useTheme } from '../theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={styles.rowLabel}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.faint }]}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function RoundButton({
  label,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.round,
        { borderColor: colors.divider, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.roundText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/** A value with − / + buttons. Avoids pulling in a slider or picker dependency. */
export function StepperRow({
  label,
  hint,
  value,
  onDecrease,
  onIncrease,
  canDecrease = true,
  canIncrease = true,
}: {
  label: string;
  hint?: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Row label={label} hint={hint}>
      <View style={styles.stepper}>
        <RoundButton
          label="−"
          accessibilityLabel={`Decrease ${label}`}
          onPress={onDecrease}
          disabled={!canDecrease}
        />
        <Text
          style={[styles.value, { color: colors.text }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${label} ${value}`}
        >
          {value}
        </Text>
        <RoundButton
          label="+"
          accessibilityLabel={`Increase ${label}`}
          onPress={onIncrease}
          disabled={!canIncrease}
        />
      </View>
    </Row>
  );
}

export function SegmentedRow<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <Row label={label} hint={hint}>
      <View style={[styles.segmented, { borderColor: colors.divider }]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && { backgroundColor: colors.divider }]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: selected ? colors.text : colors.muted },
                  selected && { fontFamily: fonts.medium },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Row>
  );
}

/** A row of theme swatches, each a tiny preview of the clock in that theme. */
export function ThemeSwatches<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: {
    value: T;
    label: string;
    preview: { background: string; text: string; accent: string };
  }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.swatchBlock, { borderBottomColor: colors.divider }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.faint }]}>{hint}</Text> : null}
      <View style={styles.swatches}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} theme`}
              style={({ pressed }) => [styles.swatchItem, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: option.preview.background,
                    borderColor: selected ? colors.accent : colors.divider,
                    borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.swatchClock, { color: option.preview.text }]}>12:30</Text>
                <View style={[styles.swatchDot, { backgroundColor: option.preview.accent }]} />
              </View>
              <Text
                style={[
                  styles.swatchLabel,
                  { color: selected ? colors.text : colors.muted },
                  selected && { fontFamily: fonts.medium },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.textButton,
        { borderColor: colors.accent, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.textButtonLabel, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  rowLabel: {
    flexShrink: 1,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: {
    fontFamily: fonts.light,
    fontSize: 22,
    lineHeight: 26,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    overflow: 'hidden',
  },
  segment: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  swatchBlock: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  swatchItem: {
    alignItems: 'center',
    minWidth: 72,
  },
  swatch: {
    width: 72,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchClock: {
    fontFamily: fonts.light,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  swatchDot: {
    position: 'absolute',
    bottom: 6,
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  swatchLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  textButton: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  textButtonLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
