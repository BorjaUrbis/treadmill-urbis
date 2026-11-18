import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_SETTINGS, Session, Settings } from './types';
import { SEED_SESSIONS } from './seed';

const K_SESSIONS = 'tu.sessions.v1';
const K_SETTINGS = 'tu.settings.v1';
const K_SEEDED = 'tu.seeded.v1';
const K_API = 'tu_anthropic_api_key';

export async function loadSessions(): Promise<Session[]> {
  const seeded = await AsyncStorage.getItem(K_SEEDED);
  if (!seeded) {
    await AsyncStorage.setItem(K_SESSIONS, JSON.stringify(SEED_SESSIONS));
    await AsyncStorage.setItem(K_SEEDED, '1');
    return SEED_SESSIONS;
  }
  const raw = await AsyncStorage.getItem(K_SESSIONS);
  return raw ? (JSON.parse(raw) as Session[]) : [];
}

export async function saveSessions(list: Session[]) {
  await AsyncStorage.setItem(K_SESSIONS, JSON.stringify(list));
}

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(K_SETTINGS);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem(K_SETTINGS, JSON.stringify(s));
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(K_API);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string | null) {
  if (key) await SecureStore.setItemAsync(K_API, key.trim());
  else await SecureStore.deleteItemAsync(K_API);
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
