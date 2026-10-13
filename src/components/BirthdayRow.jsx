// src/components/BirthdayRow.jsx — one staff member's birthday: photo (or
// initials) with a 🎂 badge, name, date, "in 3 days" / "Today", and on the
// birthday itself a Wish button for everyone EXCEPT the birthday person.
import React, { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import Avatar from "./Avatar";
import { Badge, Card } from "./ModuleUI";
import { wishBirthday } from "../services/celebrationService";
import { colors, radius } from "../theme/colors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const birthdayDate = (ymd) => {
  const [, m, d] = String(ymd).split("-").map(Number);
  return d ? `${d} ${MONTHS[(m || 1) - 1]}` : "";
};
export const whenLabel = (n) => (n === 0 ? "Today 🎉" : n === 1 ? "Tomorrow" : `in ${n} days`);

export function BirthdayAvatar({ item, size = 48 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Avatar name={item.name} uri={item.photoUrl} size={size} bg="#FCE7F3" color="#BE185D" self={!!item.isSelf} />
      <View
        style={{
          position: "absolute",
          right: -4,
          bottom: -4,
          width: size * 0.48,
          height: size * 0.48,
          borderRadius: size * 0.24,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#FBCFE8",
        }}
      >
        <Text style={{ fontSize: size * 0.26 }}>🎂</Text>
      </View>
    </View>
  );
}

// Wish button. Calls onWished(updatedItem) after a successful wish.
export function WishButton({ item, onWished, compact }) {
  const [busy, setBusy] = useState(false);
  if (item.daysUntil !== 0 || item.isSelf || !item.canWish) return null;

  if (item.wishedByMe) {
    return (
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.successSoft }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success }}>Wished ✓</Text>
      </View>
    );
  }

  const send = async () => {
    setBusy(true);
    try {
      const res = await wishBirthday(item.id, `Happy Birthday, ${item.name.split(" ")[0]}! 🎂`);
      onWished?.({ ...item, wishedByMe: true, wishCount: res?.data?.wishCount ?? item.wishCount + 1 });
    } catch (e) {
      Alert.alert("Couldn't send wish", e.response?.data?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={send}
      disabled={busy}
      activeOpacity={0.85}
      style={{
        paddingHorizontal: compact ? 12 : 14,
        paddingVertical: compact ? 6 : 8,
        borderRadius: radius.pill,
        backgroundColor: "#BE185D",
        minWidth: 74,
        alignItems: "center",
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>🎉 Wish</Text>
      )}
    </TouchableOpacity>
  );
}

export default function BirthdayRow({ item, onWished }) {
  const today = item.daysUntil === 0;
  return (
    <Card
      style={{
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        ...(today ? { borderColor: "#FBCFE8", backgroundColor: "#FFF5FA" } : null),
      }}
    >
      <BirthdayAvatar item={item} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
          {item.name}
          {item.isSelf ? " (You)" : ""}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
          🎂 {birthdayDate(item.date)}
          {item.team ? ` · ${item.team}` : ""}
        </Text>
        {today && item.wishCount ? (
          <Text style={{ fontSize: 11, color: "#BE185D", marginTop: 2 }}>
            {item.wishCount} wish{item.wishCount === 1 ? "" : "es"} so far
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Badge label={whenLabel(item.daysUntil)} tone={today ? "success" : "primary"} />
        <WishButton item={item} onWished={onWished} compact />
      </View>
    </Card>
  );
}
