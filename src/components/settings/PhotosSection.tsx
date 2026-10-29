import { useSettings } from '../../hooks/useSettings';
import type { PhotoFit } from '../../types/settings';
import { Section, SegmentedRow, StepperRow } from '../SettingsControls';

const INTERVALS = [10, 15, 30, 60, 120, 300, 600, 1800];

function label(seconds: number) {
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;
}

type OnOff = 'on' | 'off';
const onOff = [
  { value: 'on' as const, label: 'On' },
  { value: 'off' as const, label: 'Off' },
];

/** Slideshow behaviour. Photos themselves are added on the Photos page. */
export function PhotosSection() {
  const { settings, updateSettings } = useSettings();
  const index = Math.max(
    0,
    INTERVALS.findIndex((s) => s >= settings.photoInterval),
  );

  return (
    <Section title="Photos">
      <StepperRow
        label="Change photo every"
        value={label(INTERVALS[index])}
        canDecrease={index > 0}
        canIncrease={index < INTERVALS.length - 1}
        onDecrease={() => updateSettings({ photoInterval: INTERVALS[Math.max(0, index - 1)] })}
        onIncrease={() =>
          updateSettings({ photoInterval: INTERVALS[Math.min(INTERVALS.length - 1, index + 1)] })
        }
      />
      <SegmentedRow<PhotoFit>
        label="Photo fit"
        hint="Fill crops to the screen; Fit shows the whole photo"
        value={settings.photoFit}
        options={[
          { value: 'cover', label: 'Fill' },
          { value: 'contain', label: 'Fit' },
        ]}
        onChange={(photoFit) => updateSettings({ photoFit })}
      />
      <SegmentedRow<OnOff>
        label="Clock on photos"
        value={settings.photoClock ? 'on' : 'off'}
        options={onOff}
        onChange={(v) => updateSettings({ photoClock: v === 'on' })}
      />
      <SegmentedRow<OnOff>
        label="Crossfade"
        hint="Off saves a little power on very old phones"
        value={settings.photoCrossfade ? 'on' : 'off'}
        options={onOff}
        onChange={(v) => updateSettings({ photoCrossfade: v === 'on' })}
      />
      <SegmentedRow<OnOff>
        label="Shuffle"
        value={settings.photoShuffle ? 'on' : 'off'}
        options={onOff}
        onChange={(v) => updateSettings({ photoShuffle: v === 'on' })}
      />
    </Section>
  );
}
