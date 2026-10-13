// src/screens/LetterScreen.jsx — preview of one letter + Download PDF.
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ModuleUI";
import { colors, radius } from "../theme/colors";
import { SERVER_LETTERS, buildLetter, downloadLetterPdf, letterDateOf } from "../utils/letters";
import { longDate } from "../utils/pdfShare";

export default function LetterScreen({ type, issuedAt }) {
  const { myProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!myProfile) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: 13 }}>
          No staff profile is linked to your account — contact HR.
        </Text>
      </View>
    );
  }

  const built = buildLetter(type, myProfile);
  // Offer / Joining / Confirmation are made by the server from the details
  // HR entered when generating — a gap on the profile doesn't block them.
  const letter = SERVER_LETTERS.includes(type) ? { ...built, missing: null } : built;

  const download = async () => {
    if (busy || letter.missing) return;
    setBusy(true);
    try {
      await downloadLetterPdf(type, myProfile, issuedAt);
    } catch {
      Alert.alert("Download failed", "Couldn't generate the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {letter.missing ? (
        <Card>
          <Text style={{ fontSize: 13, color: colors.danger }}>{letter.missing}</Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "right", marginBottom: 10 }}>
              Date: {longDate(letterDateOf(type, myProfile, issuedAt))}
            </Text>
            {letter.paragraphs.map((p, i) => (
              <Text key={i} style={{ fontSize: 13, lineHeight: 20, color: colors.text, marginBottom: 10 }}>
                {p}
              </Text>
            ))}
          </Card>
          <TouchableOpacity
            onPress={download}
            disabled={busy}
            activeOpacity={0.85}
            style={{
              paddingVertical: 14,
              borderRadius: radius.md,
              alignItems: "center",
              backgroundColor: colors.primary,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>⬇ Download PDF</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
