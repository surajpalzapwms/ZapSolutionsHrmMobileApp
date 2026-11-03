// src/components/ViewOnlyBanner.jsx — shown to the SUPER ADMIN while a CLIENT company is
// open. Same message as the website's sidebar badge. Renders nothing for everyone else.
import React from "react";
import { Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { radius } from "../theme/colors";

export default function ViewOnlyBanner({ style }) {
  const { isViewOnly } = useAuth();
  if (!isViewOnly) return null;
  return (
    <View
      style={[
        {
          backgroundColor: "#FEF3C7",
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginHorizontal: 16,
          marginTop: 10,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>
        👁  View only — this company's admin manages it
      </Text>
    </View>
  );
}
