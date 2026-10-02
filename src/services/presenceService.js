// src/services/presenceService.js
// Automatic attendance: tells the backend "this phone is here" whenever the
// network changes, when the app opens, and every few minutes. The BACKEND
// decides whether the phone is on the office Wi-Fi (by the office's public
// IP) and signs the user in / records the disconnect time — see
// backend services/presence.js.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { get, post } from "../utils/api";

const DEVICE_ID_KEY = "presenceDeviceId";

export async function getPresenceDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * @param {"heartbeat"|"online"|"resume"|"startup"|"offline"} event
 * @returns {Promise<{inOffice:boolean, action:string, attendance?:object}|null>}
 */
export async function sendPresenceHeartbeat(event = "heartbeat") {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return null;
    const deviceId = await getPresenceDeviceId();
    const res = await post("/api/presence/heartbeat", {
      event,
      deviceId,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "other",
      name: `${Platform.OS === "ios" ? "iPhone" : "Android phone"}`,
    });
    return res.data || null;
  } catch {
    // Offline or server unreachable — the backend's timeout handles it.
    return null;
  }
}

export const presenceService = {
  getMine: () => get("/api/presence/me"),
  getLive: () => get("/api/presence/live"),
  // Admin: office Wi-Fi networks
  getOfficeNetworks: () => get("/api/presence/office-networks"),
  addOfficeNetwork: (data = {}) => post("/api/presence/office-networks", data),
};
