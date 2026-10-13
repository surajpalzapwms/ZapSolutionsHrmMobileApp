// src/presence/autoAttendance.js
// Fully automatic attendance — the staff member logs in to the app ONCE and
// never has to tap Clock in / Clock out again.
//
// IN  — reaching the office (Wi-Fi in range):
//   The phone tells the server (POST /api/presence/heartbeat) the name of
//   the Wi-Fi it is on AND whether it is inside the office GPS circle. The
//   SERVER decides and marks the in-time automatically.
//
// OUT — leaving the office:
//   The phone logs "went out" with the time it left and tells the server
//   (leftAt). The server keeps only the LATEST leaving time:
//   • Out at lunch and back → just a lunch break, NOT the going time.
//   • Out for a while and back → the server clears the disconnect (and
//     re-opens the day if it had already closed it automatically).
//   • Gone for the day → after the shift ends the server closes the day with
//     the LAST time the phone left the office.
//   The app itself never signs the user out any more — that is what used to
//   mark the lunch time as the going time.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { sendPresenceHeartbeat } from "../services/presenceService";
import { getWifiInfo } from "../utils/wifi";
import { getOfficeLocation, hasOfficeSetup, learnOfficeLocation, officeConfig } from "./officeConfig";
import { ensureToday, recordPresence } from "./officeSession";

export function distanceMeters(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

async function currentPosition({ freshGps, position }) {
  if (position?.coords) return position;
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    let pos = null;
    if (freshGps) {
      pos = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        10000
      ).catch(() => null);
    }
    if (!pos) pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(() => null);
    return pos;
  } catch {
    return null;
  }
}

/**
 * Is this phone at the office by app.json Wi-Fi names or the GPS circle?
 * gpsKnown=false means we could not tell from GPS (no fix / no circle).
 */
export async function detectOfficeByGps({ freshGps = true, position = null, wifi = null } = {}) {
  const w = wifi || (await getWifiInfo({ ask: false }));
  if (w.ssid && officeConfig.wifiNames.includes(w.ssid.toLowerCase())) {
    return { inOffice: true, via: "wifi", ssid: w.ssid, gpsKnown: true };
  }

  const office = await getOfficeLocation();
  if (office) {
    const pos = await currentPosition({ freshGps, position });
    if (pos?.coords) {
      const d = distanceMeters(pos.coords, office);
      // A rough fix (accuracy worse than the circle) can't prove "outside".
      const acc = Number(pos.coords.accuracy) || 0;
      if (d <= office.radius) return { inOffice: true, via: "gps", distance: Math.round(d), gpsKnown: true };
      return { inOffice: false, via: null, distance: Math.round(d), gpsKnown: d - acc > office.radius };
    }
  }
  return { inOffice: false, via: null, gpsKnown: false };
}

let running = null; // stops two triggers (wifi change + app open) running twice

/**
 * Check where the phone is, sign in on arrival, log breaks, and sign out
 * automatically after leaving for the day.
 * @param {{ source?:string, knownInOffice?:boolean, knownOut?:boolean,
 *           freshGps?:boolean, position?:object }} opts
 *   knownInOffice / knownOut come from the geofence enter / exit events.
 */
export function signInIfInOffice(opts = {}) {
  if (!running) {
    running = run(opts).finally(() => {
      running = null;
    });
  }
  return running;
}

const EVENT_FOR_SOURCE = {
  startup: "startup",
  resume: "resume",
  network: "online",
  timer: "heartbeat",
  background: "heartbeat",
  location: "heartbeat",
  geofence: "online",
  "geofence-exit": "heartbeat",
};

async function run({ knownInOffice = false, knownOut = false, freshGps = true, source = "app", position = null } = {}) {
  const token = await AsyncStorage.getItem("token");
  if (!token) return { inOffice: false, signedIn: false };

  // 1) Where is the phone? Wi-Fi name + office GPS circle.
  const wifi = await getWifiInfo({ ask: false });
  let det;
  if (knownOut) det = { inOffice: false, via: "geofence", gpsKnown: true };
  else if (knownInOffice) det = { inOffice: true, via: "geofence", gpsKnown: true };
  else det = await detectOfficeByGps({ freshGps, position, wifi });

  // Leaving is only logged when we are sure (geofence exit, or GPS clearly
  // outside the circle). Log it BEFORE telling the server so the server gets
  // the real leaving time, not the time this check happened to run.
  const office = await getOfficeLocation();
  if (!det.inOffice && det.gpsKnown) {
    await recordPresence({ inOffice: false, via: det.via || "gps" });
  }
  const day = await ensureToday();
  const lastOut = day.state === "out" ? [...day.events].reverse().find((e) => e.type === "out") : null;

  // 2) Tell the server. It compares the Wi-Fi name with the office Wi-Fi the
  //    admin saved, also accepts the GPS circle, and marks the attendance.
  const hb = await sendPresenceHeartbeat(EVENT_FOR_SOURCE[source] || "heartbeat", wifi, {
    geoInOffice: !!det.inOffice,
    leftAt: lastOut ? new Date(lastOut.at).toISOString() : null,
  });
  const inOffice = hb ? !!hb.inOffice : !!det.inOffice;
  const via = hb?.via || det.via || null;

  if (inOffice) {
    // On the office Wi-Fi: remember where the office is (for the GPS circle
    // that detects arriving / leaving while the app is closed).
    if (hb?.via === "wifi" || hb?.via === "ip") {
      const pos = await currentPosition({ freshGps: false, position });
      if (pos?.coords) learnOfficeLocation(pos.coords).catch(() => {});
    }
    await recordPresence({ inOffice: true, via });
  } else if (!office && hb && !det.gpsKnown) {
    // No GPS circle yet: the server's "not on the office Wi-Fi" is all we have.
    await recordPresence({ inOffice: false, via: "wifi" });
  }

  const action = hb?.action || null;
  return {
    ...det,
    inOffice,
    via,
    ssid: wifi.ssid,
    wifiReason: wifi.reason,
    action,
    signedIn: action === "signed_in" || action === "reopened",
    signedOut: action === "signed_out",
    already: ["present", "reconnected", "already_signed_out"].includes(action),
    // Anything the server changed on today's record → refresh the screens.
    changed: ["signed_in", "reopened", "reconnected", "signed_out", "disconnected"].includes(action),
    reason: hb ? hb.reason || null : "offline",
    officeNetworkConfigured: hb ? hb.officeNetworkConfigured !== false : hasOfficeSetup || !!office,
  };
}
