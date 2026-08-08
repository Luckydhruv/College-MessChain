import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthSession } from '../types/auth.types';

const authSessionKey = 'messchain.auth-session';

export const readStoredSession = async (): Promise<AuthSession | null> => {
  try {
    const stored = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.localStorage.getItem(authSessionKey) : null)
      : await SecureStore.getItemAsync(authSessionKey);

    return stored ? (JSON.parse(stored) as AuthSession) : null;
  } catch {
    return null;
  }
};

export const writeStoredSession = async (session: AuthSession) => {
  const serialized = JSON.stringify(session);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(authSessionKey, serialized);
    }
    return;
  }

  await SecureStore.setItemAsync(authSessionKey, serialized);
};

export const clearStoredSession = async () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(authSessionKey);
    }
    return;
  }

  await SecureStore.deleteItemAsync(authSessionKey);
};

const backendUrlKey = 'messchain.backend-url';

export const getDefaultBackendUrl = (): string => {
  return (
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  );
};

export const getBackendUrl = async (): Promise<string> => {
  try {
    const stored =
      Platform.OS === 'web'
        ? typeof window !== 'undefined'
          ? window.localStorage.getItem(backendUrlKey)
          : null
        : await SecureStore.getItemAsync(backendUrlKey);

    if (stored && stored.trim().length > 0) {
      return stored.trim().replace(/\/+$/, '');
    }
    return getDefaultBackendUrl().replace(/\/+$/, '');
  } catch {
    return getDefaultBackendUrl().replace(/\/+$/, '');
  }
};

export const setBackendUrl = async (url: string): Promise<void> => {
  const normalized = url.trim().replace(/\/+$/, '');
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(backendUrlKey, normalized);
    }
    return;
  }

  await SecureStore.setItemAsync(backendUrlKey, normalized);
};

