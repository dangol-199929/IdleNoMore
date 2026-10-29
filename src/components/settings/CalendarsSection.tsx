import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { getCalendarPermission, listCalendars } from '../../services/calendar';
import { fonts, useTheme } from '../../theme';
import type { CalendarSummary } from '../../types/calendar';
import { Section, SegmentedRow } from '../SettingsControls';

/** Show or hide each calendar synced to the phone. */
export function CalendarsSection() {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();
  const [calendars, setCalendars] = useState<CalendarSummary[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if ((await getCalendarPermission()) !== 'granted') {
          if (!cancelled)
            setMessage('Allow calendar access on the Calendar page to choose calendars.');
          return;
        }
        const list = await listCalendars();
        if (!cancelled) {
          setCalendars(list);
          setMessage(list.length === 0 ? 'No calendars are synced to this phone yet.' : null);
        }
      } catch (error) {
        if (!cancelled) setMessage(`Calendars could not be listed (${String(error)}).`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hidden = new Set(settings.hiddenCalendarIds);
  const toggle = (id: string, show: boolean) => {
    const next = new Set(hidden);
    if (show) next.delete(id);
    else next.add(id);
    updateSettings({ hiddenCalendarIds: [...next] });
  };

  return (
    <Section title="Calendars">
      {message ? (
        <Text style={[styles.sectionNote, { color: colors.muted }]}>{message}</Text>
      ) : null}
      {calendars?.map((calendar) => (
        <SegmentedRow<'on' | 'off'>
          key={calendar.id}
          label={calendar.title}
          hint={calendar.account}
          value={hidden.has(calendar.id) ? 'off' : 'on'}
          options={[
            { value: 'on', label: 'Show' },
            { value: 'off', label: 'Hide' },
          ]}
          onChange={(v) => toggle(calendar.id, v === 'on')}
        />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  sectionNote: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
