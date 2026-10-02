// src/presence/usePresence.js
// Foreground side of automatic attendance: sends a heartbeat when the app
// opens / comes back to the foreground, immediately whenever the phone's
// network changes (joined or left the office Wi-Fi), and every 5 minutes
// while the app is open. Calls onAttendanceChanged() when the backend
// auto-signed the user in or out so the screens refresh.
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import { sendPresenceHeartbeat } from "../services/presenceService";
import { registerPresenceTask } from "./backgroundPresence";

const FOREGROUND_INTERVAL_MS = 5 * 60 * 1000;
const CHANGED = ["signed_in", "signed_out", "reconnected", "disconnected"];

export function usePresence({ enabled, onAttendanceChanged }) {
  const [presence, setPresence] = useState(null);
  const lastNet = useRef(null);
  const cb = useRef(onAttendanceChanged);
  useEffect(() => {
    cb.current = onAttendanceChanged;
  }, [onAttendanceChanged]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const beat = async (event) => {
      const res = await sendPresenceHeartbeat(event);
      if (cancelled || !res) return;
      setPresence({
        inOffice: !!res.inOffice,
        action: res.action,
        lastDisconnectAt: res.attendance?.lastDisconnectAt || null,
        autoSignedOut: !!res.attendance?.autoSignedOut,
        ip: res.ip || null,
        officeNetworkConfigured: res.officeNetworkConfigured !== false,
        reason: res.reason || null,
        at: new Date(),
      });
      if (CHANGED.includes(res.action)) cb.current?.();
    };

    beat("startup");
    registerPresenceTask();

    const netSub = Network.addNetworkStateListener((state) => {
      const sig = `${state.type}|${state.isConnected}`;
      if (sig === lastNet.current) return;
      const first = lastNet.current === null;
      lastNet.current = sig;
      if (first) return;
      // Give the new network a moment to get an address before reporting.
      setTimeout(() => beat(state.isConnected ? "online" : "offline"), 4000);
    });

    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") beat("resume");
    });

    const timer = setInterval(() => {
      if (AppState.currentState === "active") beat("heartbeat");
    }, FOREGROUND_INTERVAL_MS);

    return () => {
      cancelled = true;
      netSub?.remove?.();
      appSub?.remove?.();
      clearInterval(timer);
    };
  }, [enabled]);

  return presence;
}
