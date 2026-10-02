// src/screens/MoreScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

const MENU = [
  { label: "Staff", icon: "people-outline", screen: "Staff", tabKey: "staff" },
  { label: "Advances", icon: "wallet-outline", screen: "Advances" },
  { label: "Office Expenses", icon: "receipt-outline", screen: "Expenses", tabKey: "expenses" },
  { label: "Holidays", icon: "sunny-outline", screen: "Holidays" },
  { label: "Leave Requests", icon: "document-text-outline", screen: "LeaveRequests" },
  { label: "Profile", icon: "person-circle-outline", screen: "Profile" },
];

export default function MoreScreen({ navigation }) {
  const { isAdmin, canAccess } = useAuth();
  // Staff / Expenses are admin-only (same as the website).
  const menu = MENU.filter((item) => !item.tabKey || (isAdmin && canAccess(item.tabKey)));
  return (
    <ScrollView style={styles.container}>
      {menu.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Ionicons name={item.icon} size={22} color="#4F46E5" />
          <Text style={styles.label}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  label: { marginLeft: 14, fontSize: 15, color: "#111827", fontWeight: "500" },
});
