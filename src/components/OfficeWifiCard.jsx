// src/components/OfficeWifiCard.jsx
// Admin only. Office Wi-Fi setup for automatic attendance.
//
// Stand in the office, connect this phone to the office Wi-Fi and press
// "Save this Wi-Fi as office". The Wi-Fi NAME (and the current network
// address) is saved on the SERVER, so every staff phone / PC on that Wi-Fi
// is signed in automatically. No app.json edit or new build needed, and a
// changing office internet IP doesn't matter.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { getWifiInfo, WIFI_REASON_TEXT } from "../utils/wifi";
import { presenceService } from "../services/presenceService";
import { colors, radius, shadow } from "../theme/colors";

export default function OfficeWifiCard() {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null); // GET /api/presence/office-networks
  const [current, setCurrent] = useState(null); // { ssid, bssid, reason }

  const load = useCallback(async () => {
    try {
      const [res, wifi] = await Promise.all([
        presenceService.getOfficeNetworks(),
        getWifiInfo({ ask: false }),
      ]);
      setInfo(res.data);
      setCurrent(wifi);
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wifis = info?.wifis || [];
  const savedNames = new Set(wifis.map((w) => String(w.ssid).toLowerCase()));
  const currentSaved = !!current?.ssid && savedNames.has(current.ssid.toLowerCase());

  const saveCurrent = async () => {
    setBusy(true);
    try {
      const wifi = await getWifiInfo({ ask: true });
      setCurrent(wifi);
      if (!wifi.ssid) {
        Alert.alert("Wi-Fi name not found", WIFI_REASON_TEXT[wifi.reason] || "Connect to the office Wi-Fi and try again.");
        return;
      }
      const res = await presenceService.addOfficeNetwork({
        name: "Office Wi-Fi",
        ssid: wifi.ssid,
        bssid: wifi.bssid || "",
      });
      Alert.alert("Saved", res.data?.message || `"${wifi.ssid}" saved as office Wi-Fi.`);
      await load();
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (w) => {
    Alert.alert("Remove office Wi-Fi?", `Staff on "${w.ssid}" will no longer be signed in automatically.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await presenceService.removeOfficeWifi(w._id);
            await load();
          } catch {
            Alert.alert("Couldn't remove", "Please try again.");
          }
        },
      },
    ]);
  };

  const configured = wifis.length > 0 || (info?.wifiFromEnv || []).length > 0 || (info?.data || []).length > 0;

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow.card }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>📶 Office Wi-Fi (automatic attendance)</Text>

      <Text style={{ marginTop: 6, fontSize: 12, color: configured ? "#047857" : "#B45309" }}>
        {info == null
          ? "Loading…"
          : configured
          ? `${wifis.length} office Wi-Fi name${wifis.length === 1 ? "" : "s"} saved. Works with any internet IP.`
          : "Not set up yet — staff are not marked automatically."}
      </Text>

      <Text style={{ marginTop: 6, fontSize: 12, color: colors.text }}>
        This phone:{" "}
        {current?.ssid
          ? `"${current.ssid}"${currentSaved ? " ✓ office Wi-Fi" : ""}`
          : WIFI_REASON_TEXT[current?.reason] || "not on Wi-Fi"}
      </Text>

      {wifis.map((w) => (
        <View
          key={w._id}
          style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontSize: 12, color: colors.text }}>• {w.ssid}</Text>
          <TouchableOpacity onPress={() => remove(w)}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#DC2626" }}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      {!currentSaved ? (
        <TouchableOpacity
          onPress={saveCurrent}
          disabled={busy}
          activeOpacity={0.85}
          style={{
            marginTop: 12,
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: 10,
            alignItems: "center",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Save this Wi-Fi as office</Text>
          )}
        </TouchableOpacity>
      ) : null}

      <Text style={{ marginTop: 10, fontSize: 11, color: "#9CA3AF" }}>
        Connect this phone to the office Wi-Fi first (mobile data off). Add every office Wi-Fi name, e.g. the 2.4 GHz
        and 5 GHz networks.
      </Text>
    </View>
  );
}
