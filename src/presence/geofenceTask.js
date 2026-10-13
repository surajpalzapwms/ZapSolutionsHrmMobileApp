// src/presence/geofenceTask.js
// The "walks into / walks out of the office" triggers. With Location set to
// "Allow all the time" the phone's OS wakes the app even when it is closed:
//
//   GEOFENCE  — the OS watches the office circle: ENTER → sign in,
//               EXIT → log the going-out time (sent to the server).
//   LOCATION  — a low-power background location watch (Android shows a
//               small "Automatic attendance is on" notification). It catches
//               arriving / leaving when a geofence event is late or missed,
//               and keeps the Wi-Fi heartbeat going.
//
// The office circle comes from app.json → extra.office.location, or is
// LEARNED automatically the first time the server confirms the office Wi-Fi.
//
// MUST be imported once at app start (backgroundPresence.js does it), because
// TaskManager.defineTask has to run at module load, outside any component.
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { distanceMeters, signInIfInOffice } from "./autoAttendance";
import { getOfficeLocation } from "./officeConfig";

export const GEOFENCE_TASK = "hrm-office-geofence";
export const LOCATION_TASK = "hrm-office-location";

// Enum names differ slightly between expo-location versions; 1 = Enter, 2 = Exit.
const ENTER = Location.GeofencingEventType?.Enter ?? Location.LocationGeofencingEventType?.Enter ?? 1;
const EXIT = Location.GeofencingEventType?.Exit ?? Location.LocationGeofencingEventType?.Exit ?? 2;

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  if (data?.eventType === ENTER) {
    await signInIfInOffice({ knownInOffice: true, source: "geofence" });
  } else if (data?.eventType === EXIT) {
    await signInIfInOffice({ knownOut: true, source: "geofence-exit" });
  }
});

// Background location: only do the full check when inside/outside changes,
// or every few minutes, so the battery and the server are spared.
const LAST_SIDE_KEY = "officeLastSide";
const LAST_FULL_KEY = "officeLastFullCheck";
const FULL_CHECK_EVERY_MS = 10 * 60 * 1000;

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const pos = data?.locations?.[data.locations.length - 1];
  if (!pos?.coords) return;
  try {
    const office = await getOfficeLocation();
    const side = office ? (distanceMeters(pos.coords, office) <= office.radius ? "in" : "out") : "unknown";
    const [lastSide, lastFull] = await Promise.all([
      AsyncStorage.getItem(LAST_SIDE_KEY),
      AsyncStorage.getItem(LAST_FULL_KEY).then(Number),
    ]);
    const due = !lastFull || Date.now() - lastFull > FULL_CHECK_EVERY_MS;
    if (side !== lastSide || due) {
      await AsyncStorage.multiSet([
        [LAST_SIDE_KEY, side],
        [LAST_FULL_KEY, String(Date.now())],
      ]);
      await signInIfInOffice({ source: "location", freshGps: false, position: pos });
    }
    // Still away: nothing to do — the server closes the day after the shift
    // with the LAST leaving time (the app never signs out by itself).
  } catch {
    // next update will try again
  }
});

/** Ask for location (and "Allow all the time" for background). */
export async function askLocationPermissions() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return { foreground: false, background: false };
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg.status === "granted" };
}

/** { foreground, background } — background = "Allow all the time". */
export async function getLocationPermissionState() {
  try {
    const [fg, bg] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);
    return { foreground: !!fg.granted, background: !!bg.granted };
  } catch {
    return { foreground: false, background: false };
  }
}

// Which circle the running geofence was started with (so a newly learned
// / moved office restarts it).
const FENCE_SIG_KEY = "officeGeofenceSig";

export async function startOfficeGeofence() {
  try {
    const office = await getOfficeLocation();
    if (!office) return false;
    const perm = await getLocationPermissionState();
    if (!perm.foreground || !perm.background) return false;

    const sig = `${office.latitude.toFixed(5)},${office.longitude.toFixed(5)},${office.radius}`;
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (started && (await AsyncStorage.getItem(FENCE_SIG_KEY)) === sig) return true;
    if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);

    await Location.startGeofencingAsync(GEOFENCE_TASK, [
      {
        identifier: "office",
        latitude: office.latitude,
        longitude: office.longitude,
        radius: office.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);
    await AsyncStorage.setItem(FENCE_SIG_KEY, sig);
    return true;
  } catch {
    return false;
  }
}

/** Low-power background location watch (needs "Allow all the time"). */
export async function startBackgroundLocation() {
  try {
    const perm = await getLocationPermissionState();
    if (!perm.foreground || !perm.background) return false;
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return true;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 60, // metres moved before a new update
      timeInterval: 5 * 60 * 1000, // Android: at most every 5 min when still
      deferredUpdatesInterval: 5 * 60 * 1000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
      activityType: Location.ActivityType?.Other,
      foregroundService: {
        notificationTitle: "Automatic attendance is on",
        notificationBody: "Your in-time and going-time are marked when you reach / leave the office.",
        notificationColor: "#6C4EE0",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopOfficeGeofence() {
  try {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch {
    // ignore
  }
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    // ignore
  }
  AsyncStorage.multiRemove([FENCE_SIG_KEY, LAST_SIDE_KEY, LAST_FULL_KEY]).catch(() => {});
}
