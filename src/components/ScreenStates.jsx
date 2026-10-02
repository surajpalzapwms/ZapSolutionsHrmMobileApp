// src/components/ScreenStates.jsx
import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { colors, radius } from "../theme/colors";

const center = { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 };

export function Loading() {
  return (
    <View style={[center, { backgroundColor: colors.screen }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorState({ message = "Something went wrong." }) {
  return (
    <View style={center}>
      <View
        style={{
          backgroundColor: colors.dangerSoft,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600", textAlign: "center" }}>
          {message}
        </Text>
      </View>
    </View>
  );
}

export function EmptyState({ emoji = "📭", message = "Nothing here yet." }) {
  return (
    <View style={[center, { paddingVertical: 48 }]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 26 }}>{emoji}</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>{message}</Text>
    </View>
  );
}
