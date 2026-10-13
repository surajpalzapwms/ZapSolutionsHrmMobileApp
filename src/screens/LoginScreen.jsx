// src/screens/LoginScreen.jsx — same layout as the testing app's login.
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import CornerLogo from "../components/CornerLogo";
import { colors, shadow } from "../theme/colors";
import { APP_NAME } from "../utils/constants";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const headerHeight = Math.max(height * 0.3, 200);
  const logoCardWidth = Math.min(width * 0.21, 85);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Enter your email or Staff ID and password.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.success) setError(result.error);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <LinearGradient
        colors={["#6C4EE0", "#8B5CF6", "#B968E0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: headerHeight,
          width: "100%",
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        }}
      >
        <CornerLogo size={logoCardWidth} loadFactor={0.4} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, marginTop: -32 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: isTablet ? 440 : undefined,
              flexGrow: 1,
              backgroundColor: "#fff",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 24,
              paddingTop: 32,
              ...shadow.card,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 0.5, color: "#4F46E5", marginBottom: 6 }}>
              {APP_NAME}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827" }}>Welcome Back</Text>
            <Text style={{ marginTop: 4, fontSize: 14, color: "#9CA3AF" }}>Enter your details below</Text>

            <View style={{ marginTop: 32, gap: 16 }}>
              <Field label="Email or Staff ID" icon="mail-outline">
                <TextInput
                  placeholder="you@company.com or ZS0019"
                  placeholderTextColor="#B0B0C3"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                  style={inputStyle}
                />
              </Field>

              <Field label="Password" icon="lock-closed-outline">
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#B0B0C3"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={inputStyle}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </Field>
            </View>

            {error ? (
              <Text style={{ marginTop: 16, fontSize: 12, fontWeight: "500", color: "#EF4444" }}>{error}</Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
              style={{ marginTop: 28, borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#6C4EE0", "#B968E0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ alignItems: "center", paddingVertical: 16 }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>
              Trouble signing in? Contact your HR admin.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, icon, children }) {
  return (
    <View>
      <Text style={{ marginBottom: 4, marginLeft: 4, fontSize: 12, fontWeight: "500", color: "#6B7280" }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F9FAFB",
          paddingHorizontal: 16,
        }}
      >
        <Ionicons name={icon} size={18} color="#9CA3AF" />
        {children}
      </View>
    </View>
  );
}

const inputStyle = { marginLeft: 8, flex: 1, paddingVertical: 14, fontSize: 14, color: "#111827" };
