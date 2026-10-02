// src/components/AttendanceRow.jsx
import React from "react";
import { View, Text } from "react-native";
import Avatar from "./Avatar";
import { colors, radius } from "../theme/colors";

export default function AttendanceRow({ name, role, time, late = false }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
      <Avatar name={name} size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: "capitalize" }}
          numberOfLines={1}
        >
          {role}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.pill,
          backgroundColor: late ? colors.dangerSoft : colors.successSoft,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", color: late ? colors.danger : colors.success }}>
          {time}
        </Text>
      </View>
    </View>
  );
}
