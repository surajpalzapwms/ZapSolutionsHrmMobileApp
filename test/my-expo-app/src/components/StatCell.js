import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function StatCell({ label, value, valueColor = colors.text, divider = false }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {divider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: "center", position: "relative" },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: "700" },
  divider: {
    position: "absolute",
    right: 0,
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: colors.border,
  },
});
