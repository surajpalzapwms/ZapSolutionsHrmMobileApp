// src/screens/LetterScreen.jsx — one HR letter for the logged-in staff
// member: View (the real PDF on screen) + Download / Share.
// The PDF is the very same one the website shows — made by the server from
// the details HR entered when generating it — for all six letters.
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ModuleUI";
import { colors, radius } from "../theme/colors";
import { LETTER_TYPES, downloadLetterPdf, letterLabel, viewLetterPdf } from "../utils/letters";
import { longDate } from "../utils/pdfShare";

export default function LetterScreen({ type, issuedAt, issuedByName }) {
  const { myProfile } = useAuth();
  const [busy, setBusy] = useState(""); // "view" | "download"
  const meta = LETTER_TYPES.find((l) => l.key === type);

  if (!myProfile) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: 13 }}>
          No staff profile is linked to your account — contact HR.
        </Text>
      </View>
    );
  }

  const run = async (kind) => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "view") await viewLetterPdf(type, myProfile);
      else await downloadLetterPdf(type, myProfile, issuedAt);
    } catch (e) {
      Alert.alert(kind === "view" ? "Couldn't open the letter" : "Download failed", e?.message || "Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ marginBottom: 16, alignItems: "center", paddingVertical: 24 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: meta?.bg || colors.primarySoft,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 28 }}>{meta?.emoji || "📄"}</Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{letterLabel(type)}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{myProfile.staffName}</Text>
        {issuedAt ? (
          <Text style={{ fontSize: 12, color: colors.success, marginTop: 8 }}>
            Issued by HR on {longDate(issuedAt)}
            {issuedByName ? ` · ${issuedByName}` : ""}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 10, textAlign: "center", lineHeight: 18 }}>
          This is the same letter HR generated on the website — company letterhead, details and signature.
        </Text>
      </Card>

      <ActionButton label="👁  View letter" primary busy={busy === "view"} onPress={() => run("view")} />
      <View style={{ height: 10 }} />
      <ActionButton label="⬇  Download / Share PDF" busy={busy === "download"} onPress={() => run("download")} />
    </ScrollView>
  );
}

function ActionButton({ label, onPress, busy, primary }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      style={{
        paddingVertical: 14,
        borderRadius: radius.md,
        alignItems: "center",
        backgroundColor: primary ? colors.primary : colors.primarySoft,
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={primary ? "#fff" : colors.primary} />
      ) : (
        <Text style={{ fontSize: 14, fontWeight: "700", color: primary ? "#fff" : colors.primary }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
