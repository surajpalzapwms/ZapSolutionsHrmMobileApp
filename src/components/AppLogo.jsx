// src/components/AppLogo.jsx — the HRM-EOVO product logo (same for every
// company). Used on the splash/loading screen and the login page only.
// Inside the app the logo is the logged-in COMPANY's own (see CornerLogo).
import React from "react";
import { Image } from "react-native";

export default function AppLogo({ size = 200, style }) {
  return (
    <Image
      source={require("../../assets/eovo-logo.png")}
      resizeMode="contain"
      accessibilityLabel="HRM-EOVO"
      style={[{ width: size, height: size }, style]}
    />
  );
}
