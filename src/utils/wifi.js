import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";

const clean = (s) => (s || "").replace(/^"|"$/g, "").trim();

/**
 * @param {{ ask?: boolean }} opts  ask=true may show the permission popup.
 * @returns {Promise<{ssid:string|null, bssid:string|null, reason?:string}>}
 */
export async function getWifiInfo({ ask = false } = {}) {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted" && ask) {
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status !== "granted") {
      return { ssid: null, bssid: null, reason: "no_location_permission" };
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      return { ssid: null, bssid: null, reason: "location_off" };
    }

    const state = await NetInfo.fetch();
    if (state.type !== "wifi" || !state.isConnected) {
      return { ssid: null, bssid: null, reason: "not_on_wifi" };
    }

    const ssid = clean(state.details?.ssid);
    if (!ssid || ssid.toLowerCase() === "<unknown ssid>") {
      return { ssid: null, bssid: null, reason: "ssid_unavailable" };
    }
    return { ssid, bssid: clean(state.details?.bssid).toLowerCase() || null };
  } catch {
    return { ssid: null, bssid: null, reason: "error" };
  }
}

export const WIFI_REASON_TEXT = {
  no_location_permission: "Allow the Location permission for this app.",
  location_off: "Turn the phone's Location switch ON.",
  not_on_wifi: "Connect to the office Wi-Fi (mobile data off).",
  ssid_unavailable: "Could not read the Wi-Fi name. Reconnect and try again.",
  error: "Could not read the Wi-Fi name. Please try again.",
};
