import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { initials } from "../utils/format";

export default function Avatar({ name, uri, size = 44, ring }) {
  const s = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 2 : 0,
    borderColor: "rgba(255,255,255,0.6)",
  };
  if (uri) return <Image source={{ uri }} style={[styles.base, s]} />;
  return (
    <View style={[styles.base, s, styles.fallback]}>
      <Text style={[styles.txt, { fontSize: size * 0.4 }]}>
        {initials(name) || "?"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.primarySoft },
  fallback: { alignItems: "center", justifyContent: "center" },
  txt: { color: colors.primary, fontWeight: "700" },
});
