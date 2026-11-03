// src/navigation/RootNavigator.jsx
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import CompanyListScreen from "../screens/CompanyListScreen";
import MainTabs from "./MainTabs";
import { colors } from "../theme/colors";
import AppLogo from "../components/AppLogo";

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.screen, primary: colors.primary },
};

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, loading, needsCompany } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <AppLogo size={220} />
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 28 }} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : needsCompany ? (
          // Super admin: every company is listed first; tapping one opens that
          // company's dashboard (Main is rebuilt for the chosen company).
          <Stack.Screen name="Companies" component={CompanyListScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
