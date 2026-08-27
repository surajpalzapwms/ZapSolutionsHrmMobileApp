import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

export default function PlaceholderScreen({ route }) {
  const title = route?.params?.title || route?.name || "Coming soon";
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>This screen is ready to be built next.</Text>

        {title === "Profile" && (
          <TouchableOpacity style={styles.logout} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutTxt}>Log out</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.dangerSoft,
  },
  logoutTxt: { color: colors.danger, fontWeight: "700" },
});
