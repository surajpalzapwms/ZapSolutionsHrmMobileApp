// src/screens/WifiSetupScreen.jsx — admin "Wi-Fi Setup" tile: office Wi-Fi
// for automatic attendance, plus how it works.
import React from "react";
import { ScrollView, Text, View } from "react-native";
import OfficeWifiCard from "../components/OfficeWifiCard";
import { Card, SectionTitle } from "../components/ModuleUI";
import { colors } from "../theme/colors";

const STEPS = [
  ["📶", "Stand in the office and connect this phone to the office Wi-Fi (turn mobile data off)."],
  ["💾", "Press “Save this Wi-Fi as office”. Repeat for every office Wi-Fi (2.4 GHz and 5 GHz)."],
  ["✅", "Staff phones and PCs on a saved Wi-Fi are signed in automatically during office hours."],
  ["🚪", "When someone leaves the Wi-Fi and doesn't come back, they are signed out automatically."],
];

export default function WifiSetupScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.screen }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <OfficeWifiCard />

      <SectionTitle style={{ marginTop: 20 }}>How automatic attendance works</SectionTitle>
      <Card>
        {STEPS.map(([emoji, text], i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10, paddingVertical: 7 }}>
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 }}>{text}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
          Staff need Location turned on (Android / iPhone only show the Wi-Fi name to apps with location access). The
          super admin is never marked automatically.
        </Text>
      </Card>
    </ScrollView>
  );
}
