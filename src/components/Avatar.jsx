// src/components/Avatar.jsx
import React from "react";
import { View, Text, Image } from "react-native";
import { colors } from "../theme/colors";
import { getInitials } from "../utils/helpers";

export default function Avatar({ name, uri, size = 44 }) {
  const s = { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft };
  if (uri) return <Image source={{ uri }} style={s} />;
  return (
    <View style={[s, { alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: size * 0.4 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
