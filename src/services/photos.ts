import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { deletePhotoRow, insertPhoto, listPhotos } from '../storage/photos';
import type { Photo } from '../types/photo';

// Photos are resized to at most this many pixels on the long edge: plenty for a
// phone screen, and it keeps storage and memory use low on an old device.
const MAX_EDGE = 2048;
const PHOTO_DIR = new Directory(Paths.document, 'photos');

/**
 * Opens Android's system photo picker. It needs no storage permission: the user
 * chooses exactly which photos the app may see. Picked photos are copied into
 * the app's private storage, because the picker's access is temporary and would
 * not survive a restart.
 *
 * Returns how many photos were added, or null if the user cancelled.
 */
export async function pickAndImportPhotos(): Promise<number | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 50,
    quality: 1,
  });
  if (result.canceled) return null;

  if (!PHOTO_DIR.exists) {
    PHOTO_DIR.create({ intermediates: true, idempotent: true });
  }

  let added = 0;
  for (const asset of result.assets) {
    const longEdge = Math.max(asset.width, asset.height);
    const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
    const context = ImageManipulator.manipulate(asset.uri);
    if (scale < 1) {
      context.resize({
        width: Math.round(asset.width * scale),
        height: Math.round(asset.height * scale),
      });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

    const file = new File(saved.uri);
    const destination = new File(PHOTO_DIR, `${Date.now()}-${added}.jpg`);
    file.move(destination);
    await insertPhoto({ uri: destination.uri, width: saved.width, height: saved.height });
    added++;
  }
  return added;
}

/** All slideshow photos, skipping (and cleaning up) any whose file has gone missing. */
export async function loadPhotos(): Promise<Photo[]> {
  const photos = await listPhotos();
  const present: Photo[] = [];
  for (const photo of photos) {
    if (new File(photo.uri).exists) {
      present.push(photo);
    } else {
      await deletePhotoRow(photo.id);
    }
  }
  return present;
}

export async function removePhoto(photo: Photo): Promise<void> {
  const file = new File(photo.uri);
  if (file.exists) file.delete();
  await deletePhotoRow(photo.id);
}
