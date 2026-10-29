import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoManager } from '../../components/PhotoManager';
import { IconButton, PillButton } from '../../components/ui';
import { useAppActive } from '../../hooks/useAppActive';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { PhotosApi } from '../../hooks/usePhotos';
import { useSettings } from '../../hooks/useSettings';
import { useSlideshow } from '../../hooks/useSlideshow';
import { fonts, spacing, type, useTheme } from '../../theme';
import { formatClock, formatLongDate, formatWeekday } from '../../utils/time';

const CONTROLS_TIMEOUT_MS = 5000;

interface PhotosPageProps {
  now: Date;
  /** True when this page is the one on screen. */
  visible: boolean;
  photos: PhotosApi;
  insets: { top: number; bottom: number; left: number; right: number };
  onOpenSettings: () => void;
}

/** Full-bleed photo frame. Tap to show controls; they hide again on their own. */
export function PhotosPage({ now, visible, photos, insets, onOpenSettings }: PhotosPageProps) {
  const { colors, name } = useTheme();
  const isNight = name.startsWith('night');
  const { settings, updateSettings } = useSettings();
  const appActive = useAppActive();
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState(false);
  const [managing, setManaging] = useState(false);

  const show = useSlideshow(
    photos.photos,
    settings.photoInterval,
    settings.photoShuffle,
    visible && appActive && !paused && !managing,
  );

  useEffect(() => {
    if (!controls) return;
    const timer = setTimeout(() => setControls(false), CONTROLS_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [controls, paused, show.index]);

  // Warm the cache so the next crossfade doesn't flash.
  useEffect(() => {
    if (show.next) Image.prefetch(show.next.uri).catch(() => {});
  }, [show.next]);

  if (photos.status === 'ready' && photos.photos.length === 0) {
    return (
      <View style={[styles.empty, { padding: spacing.xl }]}>
        <Text style={[type.title, { color: colors.text }]}>Make it a photo frame</Text>
        <Text style={[type.body, styles.emptyBody, { color: colors.muted }]}>
          Choose photos with the Android photo picker. DeskClock only sees the photos you pick,
          keeps its own copies on this phone, and never uploads them.
        </Text>
        <PillButton
          label={photos.importing ? 'Adding…' : 'Choose photos'}
          icon="image"
          variant="accent"
          disabled={photos.importing}
          onPress={photos.addPhotos}
          style={styles.emptyButton}
        />
        {photos.error ? (
          <Text style={[type.caption, { color: colors.warning, marginTop: spacing.md }]}>
            {photos.error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setControls((c) => !c)}
        accessibilityRole="button"
        accessibilityLabel={controls ? 'Hide photo controls' : 'Show photo controls'}
      >
        {show.current ? (
          <Image
            source={{ uri: show.current.uri }}
            style={StyleSheet.absoluteFill}
            contentFit={settings.photoFit}
            transition={settings.photoCrossfade && !reducedMotion ? 900 : 0}
            accessible={false}
          />
        ) : null}
        {/* At night, dim photos further so the frame doesn't light up the room. */}
        {isNight ? <View style={[StyleSheet.absoluteFill, styles.nightDim]} /> : null}
      </Pressable>

      {settings.photoClock && show.current ? (
        <View
          pointerEvents="none"
          style={[
            styles.overlay,
            { left: insets.left + spacing.xl, bottom: insets.bottom + spacing.lg },
          ]}
        >
          <Text style={styles.overlayTime}>{formatClock(now, settings.clockFormat)}</Text>
          <Text style={styles.overlayDate}>
            {formatWeekday(now)}, {formatLongDate(now)}
          </Text>
        </View>
      ) : null}

      {controls ? (
        <View
          style={[
            styles.controls,
            { bottom: insets.bottom + spacing.lg, right: insets.right + spacing.xl },
          ]}
        >
          <IconButton
            icon="skip-back"
            color="#FFFFFF"
            onPress={show.previous}
            accessibilityLabel="Previous photo"
          />
          <IconButton
            icon={paused ? 'play' : 'pause'}
            color="#FFFFFF"
            onPress={() => setPaused((p) => !p)}
            accessibilityLabel={paused ? 'Resume slideshow' : 'Pause slideshow'}
          />
          <IconButton
            icon="skip-forward"
            color="#FFFFFF"
            onPress={show.advance}
            accessibilityLabel="Next photo"
          />
          <IconButton
            icon={settings.photoFit === 'cover' ? 'minimize-2' : 'maximize-2'}
            color="#FFFFFF"
            onPress={() =>
              updateSettings({ photoFit: settings.photoFit === 'cover' ? 'contain' : 'cover' })
            }
            accessibilityLabel={
              settings.photoFit === 'cover' ? 'Fit whole photo' : 'Fill the screen'
            }
          />
          <IconButton
            icon="grid"
            color="#FFFFFF"
            onPress={() => setManaging(true)}
            accessibilityLabel="Manage photos"
          />
          <IconButton
            icon="settings"
            color="#FFFFFF"
            onPress={onOpenSettings}
            accessibilityLabel="Settings"
          />
          <Text style={styles.counter}>
            {show.index + 1} / {show.count}
            {paused ? ' · paused' : ''}
          </Text>
        </View>
      ) : null}

      <PhotoManager visible={managing} photos={photos} onClose={() => setManaging(false)} />
    </View>
  );
}

// Overlay text sits on arbitrary photos, so it uses white with a soft shadow
// rather than theme colours.
const shadow = {
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 640,
  },
  emptyBody: {
    marginTop: spacing.sm,
    lineHeight: 23,
  },
  emptyButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
  overlay: {
    position: 'absolute',
  },
  nightDim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTime: {
    fontFamily: fonts.thin,
    fontSize: 64,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    ...shadow,
  },
  overlayDate: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: '#FFFFFF',
    ...shadow,
  },
  controls: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 28,
    paddingHorizontal: spacing.sm,
  },
  counter: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
});
