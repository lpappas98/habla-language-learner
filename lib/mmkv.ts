import { createMMKV, MMKV } from 'react-native-mmkv';

// Lazy-initialize so createMMKV() is never called at module load time.
// NitroModules (MMKV v3) requires the native bridge to be fully ready first.
let _storage: MMKV | null = null;
function getStorage(): MMKV {
  if (!_storage) _storage = createMMKV({ id: 'habla-storage' });
  return _storage;
}

const STREAK_KEY = 'streak_count';
const STREAK_DATE_KEY = 'streak_last_date';
const SETTINGS_KEY = 'user_settings';

// ─── Streak helpers ─────────────────────────────────────────────────────────

export const streak = {
  get(): number {
    return getStorage().getNumber(STREAK_KEY) ?? 0;
  },
  set(value: number): void {
    getStorage().set(STREAK_KEY, value);
  },
  getLastDate(): string | null {
    return getStorage().getString(STREAK_DATE_KEY) ?? null;
  },
  setLastDate(date: string): void {
    getStorage().set(STREAK_DATE_KEY, date);
  },
};

// ─── Settings helpers ────────────────────────────────────────────────────────

export function getSettings<T>(key: string, defaultValue: T): T {
  const raw = getStorage().getString(`${SETTINGS_KEY}.${key}`);
  if (raw === undefined) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setSettings(key: string, value: unknown): void {
  getStorage().set(`${SETTINGS_KEY}.${key}`, JSON.stringify(value));
}

// ─── Auth session (used by Supabase adapter) ─────────────────────────────────

export const authStorage = {
  getItem(key: string): string | null {
    return getStorage().getString(key) ?? null;
  },
  setItem(key: string, value: string): void {
    getStorage().set(key, value);
  },
  removeItem(key: string): void {
    getStorage().remove(key);
  },
};
