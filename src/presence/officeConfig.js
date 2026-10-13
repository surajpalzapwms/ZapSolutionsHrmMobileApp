// src/presence/officeConfig.js
// Office details, set ONCE in app.json -> expo.extra.office
//
//   "office": {
//     "wifiNames": ["ZAP-Office", "ZAP-Office-5G", "ZAP-Guest"],   // any number
//     "location": { "latitude": 19.07, "longitude": 72.87, "radius": 150 },
//     "autoSignIn": { "from": "06:00", "until": "22:00" },
//     "lunch": { "from": "13:00", "until": "14:00" },     // going out now is fine
//     "autoSignOut": { "confirmMinutes": 10 }             // away this long = gone
//   }
//
// "location" is optional: the first time the server confirms the phone is on
// the office Wi-Fi, the app remembers the GPS position there and uses it as
// the office circle from then on (see learnedOfficeLocation below).
//
// Nothing here depends on the internet IP, so a changing IP does not matter.
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const raw = Constants.expoConfig?.extra?.office || {};

const wifiNames = (Array.isArray(raw.wifiNames) ? raw.wifiNames : [])
  .map((s) => String(s || "").trim().toLowerCase())
  .filter((s) => s && !s.startsWith("put-office"));

const loc = raw.location;
const location =
  loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))
    ? {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        // Android geofences work best at 100 m or more
        radius: Math.max(100, Number(loc.radius) || 150),
      }
    : null;

const toMinutes = (hhmm, fallback) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
};

export const officeConfig = {
  wifiNames,
  location,
  fromMin: toMinutes(raw.autoSignIn?.from, 6 * 60),
  untilMin: toMinutes(raw.autoSignIn?.until, 22 * 60),
  lunchFromMin: toMinutes(raw.lunch?.from, 13 * 60),
  lunchUntilMin: toMinutes(raw.lunch?.until, 14 * 60),
  // Out of the office this many minutes (outside lunch) = left for the day.
  confirmOutMs: Math.max(3, Number(raw.autoSignOut?.confirmMinutes) || 10) * 60 * 1000,
};

export const hasOfficeSetup = wifiNames.length > 0 || !!location;

const minsOf = (d) => d.getHours() * 60 + d.getMinutes();

/** Is this time inside the lunch window (default 13:00-14:00)? */
export function isLunchTime(date = new Date()) {
  const m = minsOf(date instanceof Date ? date : new Date(date));
  return m >= officeConfig.lunchFromMin && m < officeConfig.lunchUntilMin;
}

/** Today's lunch end as a Date. */
export function lunchEndToday(date = new Date()) {
  const d = new Date(date);
  d.setHours(Math.floor(officeConfig.lunchUntilMin / 60), officeConfig.lunchUntilMin % 60, 0, 0);
  return d;
}

export const lunchLabel = () => {
  const f = (m) => {
    const h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, "0");
    return `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
  };
  return `${f(officeConfig.lunchFromMin)} – ${f(officeConfig.lunchUntilMin)}`;
};

// ── Office GPS circle learned from the office Wi-Fi ─────────────────────
// Saved on the phone. app.json "location" always wins when it is set.
const LEARNED_KEY = "learnedOfficeLocation";
let learnedCache; // undefined = not read yet

export async function getOfficeLocation() {
  if (location) return location;
  if (learnedCache === undefined) {
    try {
      const raw = await AsyncStorage.getItem(LEARNED_KEY);
      learnedCache = raw ? JSON.parse(raw) : null;
    } catch {
      learnedCache = null;
    }
  }
  return learnedCache;
}

/**
 * Remember where the office is. Several readings are averaged so one poor
 * GPS fix does not move the circle. Returns true the first time it is saved.
 */
export async function learnOfficeLocation(coords) {
  if (location || !coords) return false;
  const acc = Number(coords.accuracy) || 50;
  if (acc > 80) return false; // too rough to trust
  const cur = await getOfficeLocation();
  let next;
  if (!cur) {
    next = { latitude: coords.latitude, longitude: coords.longitude, radius: 150, samples: 1 };
  } else {
    const n = Math.min(cur.samples || 1, 9);
    next = {
      latitude: (cur.latitude * n + coords.latitude) / (n + 1),
      longitude: (cur.longitude * n + coords.longitude) / (n + 1),
      radius: 150,
      samples: n + 1,
    };
  }
  learnedCache = next;
  try {
    await AsyncStorage.setItem(LEARNED_KEY, JSON.stringify(next));
  } catch {
    // keep it in memory at least
  }
  return !cur;
}

export async function forgetLearnedOfficeLocation() {
  learnedCache = null;
  try {
    await AsyncStorage.removeItem(LEARNED_KEY);
  } catch {
    // ignore
  }
}

/** Auto sign-in only runs inside this daily window (default 06:00-22:00). */
export function withinAutoSignInWindow(date = new Date()) {
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= officeConfig.fromMin && mins <= officeConfig.untilMin;
}
