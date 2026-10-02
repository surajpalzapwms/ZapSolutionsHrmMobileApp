// src/components/OfficeWifiCard.jsx
// Admin only: mark the Wi-Fi this phone is connected to as the office
// network. After that, every staff phone / PC on that Wi-Fi is signed in
// automatically (backend utils/officeNetwork.js).
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { presenceService } from "../services/presenceService";
import { colors, radius, shadow } from "../theme/colors";

export default function OfficeWifiCard() {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await presenceService.getOfficeNetworks();
      setInfo(res.data);
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    presenceService
      .getOfficeNetworks()
      .then((res) => alive && setInfo(res.data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const res = await presenceService.addOfficeNetwork({ name: "Office Wi-Fi" });
      Alert.alert("Office Wi-Fi saved", res.data?.message || "Saved");
      await load();
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!info) return null;
  const count = (info.data?.length || 0) + (info.fromEnv?.length || 0);

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow.card }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>📶 Office Wi-Fi (automatic attendance)</Text>
      <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
        {count === 0
          ? "Not set up yet — staff are not signed in automatically."
          : `${count} office network${count > 1 ? "s" : ""} saved.`}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 12, color: info.youAreOnOfficeNetwork ? "#047857" : "#6B7280" }}>
        This phone: {info.yourIp || "?"} {info.youAreOnOfficeNetwork ? "✅ office network" : ""}
      </Text>
      {!info.youAreOnOfficeNetwork ? (
        <TouchableOpacity
          onPress={save}
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
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Set this Wi-Fi as office network</Text>
          )}
        </TouchableOpacity>
      ) : null}
      <Text style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
        Connect this phone to the office Wi-Fi (turn mobile data off) before pressing the button.
      </Text>
    </View>
  );
}
