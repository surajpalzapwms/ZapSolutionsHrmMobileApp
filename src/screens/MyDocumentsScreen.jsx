// src/screens/MyDocumentsScreen.jsx — "Documents" tile: my profile photo,
// Aadhaar card, PAN card and light bill.
import React from "react";
import { ScrollView, Text } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import DocumentsPanel from "../components/DocumentsPanel";
import { colors } from "../theme/colors";

export default function MyDocumentsScreen() {
  const { reloadMyProfile, myProfile } = useAuth();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 18 }}>
        Upload a clear photo or PDF of each document. Only you, your admin and the super admin can see them.
      </Text>
      <DocumentsPanel
        staffName={myProfile?.staffName}
        onChanged={(type) => {
          if (type === "photo") reloadMyProfile?.();
        }}
      />
    </ScrollView>
  );
}
