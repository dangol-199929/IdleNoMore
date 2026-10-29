import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, type, useTheme } from '../theme';
import type { PageId } from '../types/settings';
import { PAGE_LABELS } from './settings/ScreensSection';

/** Optional row of page names along the bottom: tap instead of swiping. */
export function NavStrip({
  pages,
  current,
  onSelect,
}: {
  pages: PageId[];
  current: number;
  onSelect: (index: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.strip} accessibilityRole="tablist">
      {pages.map((page, index) => {
        const selected = index === current;
        return (
          <Pressable
            key={page}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text
              style={[
                type.caption,
                { color: selected ? colors.accent : colors.faint },
                selected && styles.selected,
              ]}
            >
              {PAGE_LABELS[page]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  item: {
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    fontFamily: 'Inter_500Medium',
  },
});
