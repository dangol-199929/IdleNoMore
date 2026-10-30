import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { spacing, type, useTheme } from '../../theme';
import { ALL_PAGES, type PageId } from '../../types/settings';
import { Section, SegmentedRow } from '../SettingsControls';
import { IconButton, PillButton } from '../ui';

export const PAGE_LABELS: Record<PageId, string> = {
  clock: 'Clock',
  commute: 'Commute',
  calendar: 'Calendar',
  reminders: 'Reminders',
  photos: 'Photos',
  dashboard: 'Dashboard',
};

/** Turn desk pages on or off, change their swipe order, and pick the start page. */
export function ScreensSection() {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();
  const enabled = settings.pages;
  const disabled = ALL_PAGES.filter((p) => !enabled.includes(p));

  const move = (page: PageId, delta: -1 | 1) => {
    const index = enabled.indexOf(page);
    const target = index + delta;
    if (target < 0 || target >= enabled.length) return;
    const next = [...enabled];
    [next[index], next[target]] = [next[target], next[index]];
    updateSettings({ pages: next });
  };

  const toggle = (page: PageId) => {
    if (enabled.includes(page)) {
      if (enabled.length === 1) return; // keep at least one page
      const next = enabled.filter((p) => p !== page);
      updateSettings({
        pages: next,
        startPage: settings.startPage === page ? 'last' : settings.startPage,
      });
    } else {
      updateSettings({ pages: [...enabled, page] });
    }
  };

  const row = (page: PageId, on: boolean, index: number) => (
    <View key={page} style={[styles.row, { borderBottomColor: colors.divider }]}>
      <Text style={[type.body, styles.label, { color: on ? colors.text : colors.faint }]}>
        {on ? `${index + 1}.  ` : ''}
        {PAGE_LABELS[page]}
      </Text>
      {on ? (
        <>
          <IconButton
            icon="arrow-up"
            onPress={() => move(page, -1)}
            accessibilityLabel={`Move ${PAGE_LABELS[page]} earlier`}
            color={index === 0 ? colors.divider : colors.muted}
          />
          <IconButton
            icon="arrow-down"
            onPress={() => move(page, 1)}
            accessibilityLabel={`Move ${PAGE_LABELS[page]} later`}
            color={index === enabled.length - 1 ? colors.divider : colors.muted}
          />
        </>
      ) : null}
      <PillButton
        label={on ? 'Hide' : 'Show'}
        onPress={() => toggle(page)}
        disabled={on && enabled.length === 1}
        accessibilityLabel={`${on ? 'Hide' : 'Show'} ${PAGE_LABELS[page]} page`}
      />
    </View>
  );

  return (
    <Section title="Screens">
      <Text style={[type.caption, { color: colors.faint }]}>
        Swipe order on the desk. Hidden pages keep their data.
      </Text>
      {enabled.map((p, i) => row(p, true, i))}
      {disabled.map((p, i) => row(p, false, i))}
      <SegmentedRow<PageId | 'last'>
        label="Start on"
        hint="Which page shows when the app opens"
        value={settings.startPage}
        options={[
          { value: 'last', label: 'Last' },
          ...enabled.slice(0, 3).map((p) => ({ value: p, label: PAGE_LABELS[p] })),
        ]}
        onChange={(startPage) => updateSettings({ startPage })}
      />
      <PillButton
        label="Reset screens to default"
        icon="rotate-ccw"
        onPress={() => updateSettings({ pages: ALL_PAGES, startPage: 'last' })}
        style={styles.reset}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  label: {
    flex: 1,
  },
  reset: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
});
