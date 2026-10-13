import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBrand } from "../context/BrandContext";
import { login } from "../api/client";

export default function LoginScreen({ onLoggedIn }) {
  const brand = useBrand();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const { token, user } = await login(email.trim(), password);
      await AsyncStorage.setItem("token", token);
      onLoggedIn(user);
    } catch (e) {
      setError("Login failed. Check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      {brand.logoUrl ? (
        <Image source={{ uri: brand.logoUrl }} style={s.logo} resizeMode="contain" />
      ) : (
        <View style={[s.logoFallback, { backgroundColor: brand.primary }]}>
          <Text style={s.logoLetter}>{brand.name.charAt(0)}</Text>
        </View>
      )}
      <Text style={[s.title, { color: brand.primary }]}>{brand.name}</Text>

      <TextInput style={s.input} placeholder="Email or Staff ID" autoCapitalize="none" autoCorrect={false} keyboardType="default" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.button, { backgroundColor: brand.primary }]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  logo: { width: 160, height: 80, alignSelf: "center", marginBottom: 12 },
  logoFallback: { width: 80, height: 80, borderRadius: 40, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoLetter: { color: "#fff", fontSize: 36, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 28 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, marginBottom: 12 },
  button: { padding: 14, borderRadius: 10, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#dc2626", marginBottom: 8 },
});
