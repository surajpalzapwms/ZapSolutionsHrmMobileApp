import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Avatar from "./Avatar";
import { colors, radius } from "../theme/colors";

export default function AttendanceRow({ name, role, time, uri = undefined, late = false }) {
  return (
    <View style={styles.row}>
      <Avatar name={name} uri={uri} size={44} />
      <View style={styles.mid}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {role}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: late ? colors.dangerSoft : colors.successSoft },
        ]}
      >
        <Text
          style={[
            styles.badgeTxt,
            { color: late ? colors.danger : colors.success },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  mid: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  role: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeTxt: { fontSize: 12, fontWeight: "700" },
});
