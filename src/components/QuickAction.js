import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow } from "../theme/colors";

export default function QuickAction({ icon, label, tint = colors.primary, onPress }) {
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.chip, { backgroundColor: tint + "1A" }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "25%", alignItems: "center", marginBottom: 18 },
  chip: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...shadow.soft,
  },
  label: { fontSize: 12, color: colors.text, fontWeight: "500" },
});
