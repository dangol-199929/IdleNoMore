import type { Photo } from '../types/photo';
import { getDatabase } from './database';

export async function listPhotos(): Promise<Photo[]> {
  return getDatabase().getAllAsync<Photo>(
    'SELECT id, uri, width, height FROM photos ORDER BY added_at, id',
  );
}

export async function insertPhoto(photo: Omit<Photo, 'id'>): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO photos (uri, width, height, added_at) VALUES (?, ?, ?, ?)',
    photo.uri,
    photo.width,
    photo.height,
    Date.now(),
  );
}

export async function deletePhotoRow(id: number): Promise<void> {
  await getDatabase().runAsync('DELETE FROM photos WHERE id = ?', id);
}
