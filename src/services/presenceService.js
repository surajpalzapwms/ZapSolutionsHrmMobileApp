// src/services/presenceService.js
// Automatic attendance: tells the backend "this phone is here" (and the name
// of the Wi-Fi it is connected to) whenever the network changes, when the
// app opens, and every few minutes. The BACKEND decides whether the phone is
// on the office Wi-Fi (by Wi-Fi name, or by the office's network address)
// and signs the user in / records the disconnect time — see backend
// services/presence.js and utils/officeNetwork.js.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { get, post, del } from "../utils/api";

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
export async function sendPresenceHeartbeat(event = "heartbeat", wifi = null, { geoInOffice = false, leftAt = null } = {}) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return null;
    const deviceId = await getPresenceDeviceId();
    const res = await post("/api/presence/heartbeat", {
      event,
      deviceId,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "other",
      name: `${Platform.OS === "ios" ? "iPhone" : "Android phone"}`,
      wifi: wifi?.ssid ? { ssid: wifi.ssid, bssid: wifi.bssid || "" } : null,
      // Inside the office GPS circle (works even when the Wi-Fi name can't be
      // read in the background) and, when out, the time the phone left.
      geo: { inOffice: !!geoInOffice },
      leftAt: leftAt || null,
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
  // { ssid, bssid?, name? } -> saves this Wi-Fi name AND the current address
  addOfficeNetwork: (data = {}) => post("/api/presence/office-networks", data),
  addOfficeWifi: (data = {}) => post("/api/presence/office-wifis", data),
  removeOfficeWifi: (id) => del(`/api/presence/office-wifis/${id}`),
};
