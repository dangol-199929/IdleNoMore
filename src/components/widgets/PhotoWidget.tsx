import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSlideshow } from '../../hooks/useSlideshow';
import type { Photo } from '../../types/photo';
import { EmptyText, WidgetHeader } from '../ui';

/** A small rotating photo tile for the dashboard. */
export function PhotoWidget({
  photos,
  interval,
  running,
}: {
  photos: Photo[];
  interval: number;
  running: boolean;
}) {
  const show = useSlideshow(photos, interval, true, running);
  const reducedMotion = useReducedMotion();
  if (!show.current) {
    return (
      <View>
        <WidgetHeader title="Photos" />
        <EmptyText>Add photos on the Photos page.</EmptyText>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: show.current.uri }}
      style={styles.image}
      contentFit="cover"
      transition={reducedMotion ? 0 : 800}
      accessibilityLabel="Photo from your slideshow"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
    borderRadius: 12,
  },
});
