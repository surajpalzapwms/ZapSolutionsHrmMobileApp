// src/utils/photoStore.js — everything an <Avatar> needs to show a photo.
//
// Why photos were not showing:
//   1. The server sends RELATIVE links ("/api/documents/photo/…"). Some
//      screens (My Documents, staff lists) passed them to <Image> as-is.
//   2. Photos are private (only you / admin / super admin), so the server
//      needs the login token — <Image> never sent it.
//   3. After a new upload the link stays the same, so the phone kept
//      showing the old (or failed) cached image.
// Fixes: photoSource() builds the full URL + Authorization header + a
// version number that changes after every upload/remove; and your own
// newly uploaded photo is also kept on the phone so it shows instantly
// in Home, Profile, My Documents and the birthday cards.
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { absoluteUrl } from "./helpers";
import { BACKEND_URL } from "./constants";
import { getAuthTokenSync } from "./authToken";

// Your photo is saved on the phone PER USER ("myPhotoLocal:<userId>") and is
// NOT deleted on logout — it comes back as soon as the same person logs in
// again (even offline). Another person logging in on this phone never sees it.
const LEGACY_LOCAL_KEY = "myPhotoLocal"; // old single-user key (migrated)
const LOCAL_PREFIX = "myPhotoLocal:"; // + userId -> { uri: "data:image/jpeg;base64,…", at }
const VERSION_KEY = "photoVersion";

let currentUserId = null;
let state = { version: 0, myLocal: null };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const setState = (patch) => {
  state = { ...state, ...patch };
  emit();
};

const localKey = (userId) => LOCAL_PREFIX + String(userId);

// Cache version is not personal — load it once at app start.
(async () => {
  try {
    const ver = await AsyncStorage.getItem(VERSION_KEY);
    setState({ version: Number(ver) || 0 });
  } catch {
    // nothing saved yet
  }
})();

/** Call when we know who is logged in: shows that user's saved photo. */
export async function loadPhotoForUser(userId) {
  if (!userId) return;
  currentUserId = String(userId);
  try {
    let raw = await AsyncStorage.getItem(localKey(currentUserId));
    if (!raw) {
      // One-time move of a photo saved by an older version of the app.
      const legacy = await AsyncStorage.getItem(LEGACY_LOCAL_KEY);
      if (legacy) {
        raw = legacy;
        await AsyncStorage.setItem(localKey(currentUserId), legacy);
        await AsyncStorage.removeItem(LEGACY_LOCAL_KEY);
      }
    }
    if (currentUserId !== String(userId)) return; // user changed meanwhile
    setState({ myLocal: raw ? JSON.parse(raw)?.uri || null : null });
  } catch {
    // bad saved copy — fall back to the server photo
  }
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => state;

export function usePhotoState() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Call after ANY photo upload/remove (yours or, for admins, a staff member's). */
export function bumpPhotoVersion() {
  const version = Date.now();
  setState({ version });
  AsyncStorage.setItem(VERSION_KEY, String(version)).catch(() => {});
}

/** Your own photo just uploaded from this phone (data URI), or null after Remove. */
export function setMyLocalPhoto(uri) {
  setState({ myLocal: uri || null });
  if (currentUserId) {
    const key = localKey(currentUserId);
    if (uri) AsyncStorage.setItem(key, JSON.stringify({ uri, at: Date.now() })).catch(() => {});
    else AsyncStorage.removeItem(key).catch(() => {});
  }
  bumpPhotoVersion();
}

/**
 * Logout: stop showing the photo on screen, but KEEP it saved on the phone
 * so it is there again when the same user logs back in.
 */
export function clearPhotoStore() {
  currentUserId = null;
  setState({ myLocal: null });
}

/** <Image source> for a server photo link: full URL + token. */
export function photoSource(path, version = state.version) {
  const url = absoluteUrl(path);
  if (!url) return null;
  if (/^(data:|file:)/i.test(url)) return { uri: url };
  // Token only for our own server — never sent to outside image links.
  const ours = url.startsWith(String(BACKEND_URL || "").replace(/\/+$/, ""));
  const token = ours ? getAuthTokenSync() : null;
  // Server links (/api/documents/photo/… and /file/…) are SIGNED and already
  // carry their own version (?v=…&s=…). Adding another "v=" changes what the
  // server verifies, so it answers 403 "Invalid photo link" and the photo
  // disappears after logout/login. Never touch them; a new upload gets a new
  // signed link by itself. Only other links get the cache-busting version.
  const signed = /[?&]s=[^&]+/.test(url) && /\/api\/documents\//.test(url);
  let uri = url;
  if (!signed && version) uri = `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
  return {
    uri,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}