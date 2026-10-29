import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { PhotosApi } from '../hooks/usePhotos';
import { spacing, type, useTheme } from '../theme';
import type { Photo } from '../types/photo';
import { PillButton } from './ui';

const THUMB = 120;

/** Grid of slideshow photos with add and remove. Removing deletes only the app's copy. */
export function PhotoManager({
  visible,
  photos,
  onClose,
}: {
  visible: boolean;
  photos: PhotosApi;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const columns = Math.max(3, Math.floor((width - spacing.lg * 2) / (THUMB + spacing.sm)));

  const renderItem = ({ item }: { item: Photo }) => {
    const confirming = pendingRemove === item.id;
    return (
      <Pressable
        onPress={() => {
          if (confirming) {
            photos.remove(item);
            setPendingRemove(null);
          } else {
            setPendingRemove(item.id);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={confirming ? 'Tap again to remove this photo' : 'Photo. Tap to remove.'}
        style={styles.thumbWrap}
      >
        <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
        {confirming ? (
          <View style={[styles.removeOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Feather name="trash-2" size={22} color={colors.warning} />
            <Text style={[type.caption, { color: '#FFFFFF' }]}>Tap to remove</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[type.title, { color: colors.text }]}>Photos</Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {photos.photos.length} in the slideshow · copies are kept only on this phone
            </Text>
          </View>
          <PillButton
            label={photos.importing ? 'Adding…' : 'Add photos'}
            icon="plus"
            variant="accent"
            disabled={photos.importing}
            onPress={photos.addPhotos}
          />
          <PillButton label="Done" onPress={onClose} />
        </View>
        {photos.error ? (
          <Text style={[type.caption, { color: colors.warning, marginBottom: spacing.sm }]}>
            {photos.error}
          </Text>
        ) : null}
        <FlatList
          key={columns}
          data={photos.photos}
          numColumns={columns}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  removeOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
