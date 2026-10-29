import { Text } from 'react-native';

import { useSettings } from '../../hooks/useSettings';
import { type, useTheme } from '../../theme';
import type { MotionPreference } from '../../types/settings';
import { formatMinuteOfDay } from '../../utils/time';
import { Section, SegmentedRow, StepperRow } from '../SettingsControls';
import { TIME_STEP, stepTime } from './DisplaySection';

const IDLE_STEPS = [0, 5, 10, 15, 30, 60];
const onOff = [
  { value: 'on' as const, label: 'On' },
  { value: 'off' as const, label: 'Off' },
];

/** Screen-on behaviour, sleep window, animations and idle slideshow. */
export function PowerSection() {
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();
  const idleIndex = Math.max(0, IDLE_STEPS.indexOf(settings.autoSlideshow));

  return (
    <>
      <Section title="Screen">
        <SegmentedRow<'on' | 'off'>
          label="Keep screen on"
          hint="While the desk display is showing"
          value={settings.keepAwake ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ keepAwake: v === 'on' })}
        />
        <SegmentedRow<'on' | 'off'>
          label="Sleep schedule"
          hint="Let the screen turn off on its normal timeout during these hours"
          value={settings.sleepEnabled ? 'on' : 'off'}
          options={onOff}
          onChange={(v) => updateSettings({ sleepEnabled: v === 'on' })}
        />
        {settings.sleepEnabled ? (
          <>
            <StepperRow
              label="Sleep from"
              value={formatMinuteOfDay(settings.sleepStart)}
              onDecrease={() =>
                updateSettings({ sleepStart: stepTime(settings.sleepStart, -TIME_STEP) })
              }
              onIncrease={() =>
                updateSettings({ sleepStart: stepTime(settings.sleepStart, TIME_STEP) })
              }
            />
            <StepperRow
              label="Wake at"
              value={formatMinuteOfDay(settings.sleepEnd)}
              onDecrease={() =>
                updateSettings({ sleepEnd: stepTime(settings.sleepEnd, -TIME_STEP) })
              }
              onIncrease={() =>
                updateSettings({ sleepEnd: stepTime(settings.sleepEnd, TIME_STEP) })
              }
            />
          </>
        ) : null}
        <Text style={[type.caption, { color: colors.faint, marginTop: 8 }]}>
          Android doesn’t let apps switch the screen off or back on by themselves. During the sleep
          window DeskClock simply stops holding the screen on; tap the phone in the morning to wake
          it.
        </Text>
      </Section>

      <Section title="Behaviour">
        <StepperRow
          label="Switch to photos when idle"
          hint="After this long without a touch"
          value={settings.autoSlideshow === 0 ? 'Never' : `${settings.autoSlideshow} min`}
          canDecrease={idleIndex > 0}
          canIncrease={idleIndex < IDLE_STEPS.length - 1}
          onDecrease={() => updateSettings({ autoSlideshow: IDLE_STEPS[idleIndex - 1] ?? 0 })}
          onIncrease={() =>
            updateSettings({
              autoSlideshow: IDLE_STEPS[Math.min(IDLE_STEPS.length - 1, idleIndex + 1)],
            })
          }
        />
        <SegmentedRow<MotionPreference>
          label="Animations"
          hint="Reduced also saves a little power"
          value={settings.motion}
          options={[
            { value: 'system', label: 'System' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'full', label: 'Full' },
          ]}
          onChange={(motion) => updateSettings({ motion })}
        />
        <Text style={[type.caption, { color: colors.faint, marginTop: 8 }]}>
          Keep the phone charging, and set DeskClock’s battery saver to “No restrictions” in Android
          settings so the system doesn’t close it. The app can’t start itself after the phone
          restarts.
        </Text>
      </Section>
    </>
  );
}
