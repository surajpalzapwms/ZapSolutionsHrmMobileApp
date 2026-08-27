import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import Svg, { Rect, Path, Circle, Line } from "react-native-svg";
import { colors, radius } from "../theme/colors";

// Simple inline line-art illustration (desk + person) so the screen has no
// external asset dependency. Swap for an <Image> when you have artwork.
function DeskIllustration() {
  return (
    <Svg width="220" height="200" viewBox="0 0 220 200">
      <Line x1="20" y1="170" x2="200" y2="170" stroke={colors.text} strokeWidth="2" />
      <Rect x="120" y="120" width="70" height="50" rx="3" stroke={colors.text} strokeWidth="2" fill="none" />
      <Rect x="135" y="70" width="45" height="35" rx="3" stroke={colors.text} strokeWidth="2" fill="none" />
      <Line x1="157" y1="105" x2="157" y2="120" stroke={colors.text} strokeWidth="2" />
      <Line x1="145" y1="120" x2="170" y2="120" stroke={colors.text} strokeWidth="2" />
      <Circle cx="70" cy="55" r="14" stroke={colors.text} strokeWidth="2" fill="none" />
      <Path d="M55 90 Q70 72 85 90 L88 130 L52 130 Z" stroke={colors.text} strokeWidth="2" fill="none" />
      <Path d="M88 110 Q110 108 122 118" stroke={colors.text} strokeWidth="2" fill="none" />
      <Path d="M58 130 L55 170 M82 130 L88 170" stroke={colors.text} strokeWidth="2" />
      <Rect x="46" y="132" width="42" height="30" rx="6" stroke={colors.text} strokeWidth="2" fill="none" />
    </Svg>
  );
}

export default function OnboardingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.replace("Login")}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.art}>
        <DeskIllustration />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>Effortless{"\n"}Attendance Tracking</Text>
        <Text style={styles.sub}>
          Log your attendance effortlessly. Clock in, clock out — it's that
          simple. Focus on your work, and we'll take care of the rest.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.85}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={styles.ctaTxt}>Next</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card, paddingHorizontal: 24 },
  top: { alignItems: "flex-end", paddingTop: 8 },
  skip: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  art: { flex: 1, alignItems: "center", justifyContent: "center" },
  copy: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    lineHeight: 34,
  },
  sub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  cta: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  ctaTxt: { color: colors.textOnPrimary, fontSize: 16, fontWeight: "700" },
});
