// src/components/StaffWise.jsx — small pieces shared by the staff-wise
// views (Advances, Payroll, Leave): a staff row with photo, a back link,
// a totals header and the Android back-button hook.
import React, { useEffect, useMemo } from "react";
import { BackHandler, Text, TouchableOpacity, View } from "react-native";
import Avatar from "./Avatar";
import { Card } from "./ModuleUI";
import { useAllStaff } from "./StaffPicker";
import { colors, radius } from "../theme/colors";

export const idOf = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : v ? String(v) : "");

// { [staffId]: staff } from the (cached) all-staff list — for photos / names.
export function useStaffMap(enabled = true) {
  const { staff, loading } = useAllStaff(enabled);
  const map = useMemo(() => {
    const m = {};
    staff.forEach((s) => {
      m[String(s._id)] = s;
    });
    return m;
  }, [staff]);
  return { map, staff, loading };
}

// Android back button runs `onBack` while `active`.
export function useBackHandler(active, onBack) {
  useEffect(() => {
    if (!active) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [active, onBack]);
}

export function BackLink({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} style={{ marginBottom: 12, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>‹ {label}</Text>
    </TouchableOpacity>
  );
}

export function StaffRow({ name, photoUrl, subtitle, meta, amount, amountColor, right, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} disabled={!onPress}>
      <Card style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
        <Avatar name={name} uri={photoUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {amount != null ? (
          <Text style={{ fontSize: 15, fontWeight: "800", color: amountColor || colors.text }}>{amount}</Text>
        ) : null}
        {right}
        {onPress ? <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text> : null}
      </Card>
    </TouchableOpacity>
  );
}

// Purple totals card: [{ label, value }]
export function TotalsHeader({ title, items }) {
  return (
    <View style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: 16, marginBottom: 14 }}>
      <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12, fontWeight: "700" }}>{title}</Text>
      <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
        {items.map((it) => (
          <View key={it.label} style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }} numberOfLines={1} adjustsFontSizeToFit>
              {it.value}
            </Text>
            <Text style={{ color: "#fff", opacity: 0.8, fontSize: 11, marginTop: 2 }}>{it.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
