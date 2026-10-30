import * as SecureStore from 'expo-secure-store';

// The user's own TfNSW Open Data key. It's never part of the app bundle or the
// repository: the user enters it in Settings and it's kept in Android's
// encrypted keystore-backed storage on the phone.
const KEY_NAME = 'tfnsw-api-key';

export async function getApiKey(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    if (stored) return stored;
  } catch {
    // fall through
  }
  // Development only: a key supplied through the dev server's environment, so the
  // feature can be tested on an emulator. Release builds never set this variable.
  return __DEV__ ? process.env.EXPO_PUBLIC_TFNSW_DEV_KEY?.trim() || null : null;
}

export async function setApiKey(value: string | null): Promise<void> {
  if (value && value.trim()) {
    await SecureStore.setItemAsync(KEY_NAME, value.trim());
  } else {
    await SecureStore.deleteItemAsync(KEY_NAME);
  }
}
