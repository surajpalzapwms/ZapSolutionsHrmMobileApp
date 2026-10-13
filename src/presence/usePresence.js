import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { signInIfInOffice } from "./autoAttendance";
import { registerPresenceTask } from "./backgroundPresence";
import {
  askLocationPermissions,
  getLocationPermissionState,
  startBackgroundLocation,
  startOfficeGeofence,
} from "./geofenceTask";
import { hasOfficeSetup, officeConfig } from "./officeConfig";
import { loadToday } from "./officeSession";

const FOREGROUND_INTERVAL_MS = 3 * 60 * 1000;
const ASKED_KEY = "locationPermissionAsked";

// Explain WHY before the system popup, once per install. Location is needed
// even without a GPS circle: Android/iOS only let an app read the NAME of
// the connected Wi-Fi when Location is allowed (and switched on). With
// "Allow all the time" the app marks both the in-time and the going-time by
// itself — no Clock in / Clock out taps needed.
async function ensurePermissionsOnce() {
  if (await AsyncStorage.getItem(ASKED_KEY)) return;
  await AsyncStorage.setItem(ASKED_KEY, "1");
  await new Promise((resolve) => {
    Alert.alert(
      "Automatic attendance",
      "Your attendance can be marked by itself: signed in when you reach the office and signed out " +
        "(with your going time) when you leave. A lunch break is fine.\n\n" +
        "On the next screens allow Location and choose \"Allow all the time\" " +
        "(Android: Location › Allow all the time).",
      [{ text: "Continue", onPress: async () => { await askLocationPermissions(); resolve(); } }],
      { cancelable: false }
    );
  });
}

/** Send the user to the app's settings page to pick "Allow all the time". */
export async function openAllowAllTheTime() {
  const res = await askLocationPermissions().catch(() => null);
  if (res?.background) return true;
  Alert.alert(
    "Allow all the time",
    "Open Settings › Permissions › Location and choose \"Allow all the time\". " +
      "Then your attendance is marked automatically, even when the app is closed.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: () => Linking.openSettings().catch(() => {}) },
    ]
  );
  return false;
}

export function usePresence({ enabled, onAttendanceChanged }) {
  const [presence, setPresence] = useState(null);
  // "Allow all the time" granted → fully automatic (no manual buttons).
  const [autoMode, setAutoMode] = useState(false);
  const lastNet = useRef(null);
  const cb = useRef(onAttendanceChanged);
  useEffect(() => {
    cb.current = onAttendanceChanged;
  }, [onAttendanceChanged]);

  const refreshPermission = useCallback(async () => {
    const perm = await getLocationPermissionState();
    setAutoMode(perm.foreground && perm.background);
    if (perm.foreground && perm.background) {
      // Both are no-ops when already running (or when no office circle yet).
      await startOfficeGeofence();
      await startBackgroundLocation();
    }
    return perm;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const check = async (source) => {
      const r = await signInIfInOffice({ source });
      if (cancelled || !r) return;
      await loadToday(); // background tasks may have written breaks meanwhile
      setPresence({
        inOffice: !!r.inOffice,
        via: r.via || null,
        action: r.action === "reopened" ? "reopened" : r.signedIn ? "signed_in" : r.signedOut ? "signed_out" : r.already ? "already_in" : "none",
        reason: r.reason && r.reason !== "offline" ? r.reason : null,
        officeNetworkConfigured: r.officeNetworkConfigured ?? hasOfficeSetup,
        wifiName: r.ssid || null,
        wifiReason: r.wifiReason || null,
        ip: null,
        at: new Date(),
      });
      if (r.changed) cb.current?.(); // refresh the screens
      // The office circle may have just been learned → start watching it.
      refreshPermission();
    };

    (async () => {
      await loadToday();
      await ensurePermissionsOnce();
      if (cancelled) return;
      await refreshPermission();
      registerPresenceTask();
      check("startup");
    })();

    const netSub = Network.addNetworkStateListener((state) => {
      const sig = `${state.type}|${state.isConnected}`;
      if (sig === lastNet.current) return;
      const first = lastNet.current === null;
      lastNet.current = sig;
      if (first) return;
      // Wi-Fi dropped / changed: check at once (leaving is logged with this
      // time). On a new connection let it finish connecting first.
      setTimeout(() => check("network"), state.isConnected ? 3000 : 500);
    });

    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        refreshPermission(); // user may have just changed it in Settings
        check("resume");
      }
    });

    const timer = setInterval(() => {
      if (AppState.currentState === "active") check("timer");
    }, FOREGROUND_INTERVAL_MS);

    return () => {
      cancelled = true;
      netSub?.remove?.();
      appSub?.remove?.();
      clearInterval(timer);
    };
  }, [enabled, refreshPermission]);

  return { presence, autoMode, refreshPermission };
}

export { officeConfig };
