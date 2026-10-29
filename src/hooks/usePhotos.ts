import { useCallback, useEffect, useState } from 'react';

import { loadPhotos, pickAndImportPhotos, removePhoto } from '../services/photos';
import type { Photo } from '../types/photo';

export interface PhotosApi {
  status: 'loading' | 'ready' | 'error';
  photos: Photo[];
  /** True while picked photos are being copied in. */
  importing: boolean;
  error: string | null;
  addPhotos: () => void;
  remove: (photo: Photo) => void;
}

export function usePhotos(): PhotosApi {
  const [status, setStatus] = useState<PhotosApi['status']>('loading');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setPhotos(await loadPhotos());
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(`Photos could not be loaded (${String(e)}).`);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [reload]);

  const addPhotos = useCallback(async () => {
    setError(null);
    setImporting(true);
    try {
      await pickAndImportPhotos();
    } catch (e) {
      setError(`Some photos could not be added (${String(e)}).`);
    } finally {
      setImporting(false);
      await reload();
    }
  }, [reload]);

  const remove = useCallback(
    async (photo: Photo) => {
      try {
        await removePhoto(photo);
      } catch (e) {
        setError(`The photo could not be removed (${String(e)}).`);
      }
      await reload();
    },
    [reload],
  );

  return { status, photos, importing, error, addPhotos, remove };
}
