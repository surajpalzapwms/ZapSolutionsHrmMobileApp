// src/utils/appCache.js — "show last data instantly, refresh in background".
//   memory: lives until logout / app close (lists in the Home sheets)
//   persist: also saved on the phone, so Home is filled the moment the app
//            opens (birthdays, holidays, letter status)
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "cache:";
const mem = new Map();

export function cacheGet(key) {
  return mem.get(key);
}

export function cacheSet(key, value, { persist = false } = {}) {
  mem.set(key, value);
  if (persist) AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
}

/** Memory first, then the copy saved on the phone (undefined if none). */
export async function cacheLoad(key) {
  if (mem.has(key)) return mem.get(key);
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw != null) {
      const v = JSON.parse(raw);
      mem.set(key, v);
      return v;
    }
  } catch {
    // ignore a bad saved copy
  }
  return undefined;
}

/** Logout: forget everything (the next user must never see old data). */
export function clearAppCaches() {
  mem.clear();
  AsyncStorage.getAllKeys()
    .then((keys) => AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX))))
    .catch(() => {});
}
