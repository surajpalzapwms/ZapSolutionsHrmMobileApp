// src/screens/DashboardScreen.jsx
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/Card";

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingVertical: 16 }}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user?.name ? `Hi, ${user.name}` : "Welcome back"}
        </Text>
        <Text style={styles.role}>{user?.role || ""}</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardBody}>
          Use the Attendance tab to sign in / sign out, check Payroll for your
          latest payslips, and open More for staff, advances, expenses,
          holidays and leave requests.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: { paddingHorizontal: 20, marginBottom: 8 },
  greeting: { fontSize: 22, fontWeight: "700", color: "#111827" },
  role: { fontSize: 13, color: "#6B7280", marginTop: 2, textTransform: "capitalize" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 6 },
  cardBody: { fontSize: 13, color: "#4B5563", lineHeight: 19 },
});
