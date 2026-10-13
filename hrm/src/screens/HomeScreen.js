import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBrand } from "../context/BrandContext";
import { getEmployees } from "../api/client";

export default function HomeScreen({ user, onLogout }) {
  const brand = useBrand();
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees().then(setEmployees).catch(() => {});
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    onLogout();
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { backgroundColor: brand.primary }]}>
        {brand.logoUrl ? (
          <Image source={{ uri: brand.logoUrl }} style={s.headerLogo} resizeMode="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.company}>{brand.name}</Text>
          <Text style={s.user}>Welcome, {user?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={s.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.section}>Employees</Text>
      <FlatList
        data={employees}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={[s.dot, { backgroundColor: brand.accent }]} />
            <View>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.dept}>{item.dept}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 54, paddingBottom: 18, paddingHorizontal: 16 },
  headerLogo: { width: 44, height: 44, marginRight: 12, backgroundColor: "#fff", borderRadius: 8 },
  company: { color: "#fff", fontSize: 18, fontWeight: "700" },
  user: { color: "#e5e7eb", marginTop: 2 },
  logout: { color: "#fff", fontWeight: "600" },
  section: { fontSize: 16, fontWeight: "700", margin: 16 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  name: { fontWeight: "600", fontSize: 15 },
  dept: { color: "#6b7280", marginTop: 2 },
});
