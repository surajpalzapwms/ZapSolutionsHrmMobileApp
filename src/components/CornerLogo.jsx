// src/components/CornerLogo.jsx — white logo tab pinned to a header's top-left corner.
// Shows the logged-in COMPANY's own logo (set by the company, comes from the
// server as company.logoUrl). A company without a logo shows its initials.
// Nothing here is bundled with the app, so no company sees another one's logo.
import React from "react";
import { Image, Text, View } from "react-native";
import { shadow } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import { fileUrl } from "../utils/api";

function LogoMark({ width, height }) {
  const { tenant } = useAuth();

  if (tenant?.logoUrl) {
    return <Image source={{ uri: fileUrl(tenant.logoUrl) }} resizeMode="contain" style={{ width, height }} />;
  }
  const initials = String(tenant?.companyName || tenant?.companyCode || "")
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
  if (!initials) return null;
  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, fontWeight: "800", color: tenant?.primaryColor || "#4F46E5" }}>
        {initials}
      </Text>
    </View>
  );
}

export default function CornerLogo({ size = 64, loadFactor = 0.4, variant = "corner", height }) {
  if (variant === "inline") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          marginRight: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
          ...shadow.card,
        }}
      >
        <LogoMark width={size * 0.8} height={loadFactor * size} />
      </View>
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height,
        paddingVertical: height ? 0 : 8,
        borderBottomRightRadius: 20,
        zIndex: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        ...shadow.card,
      }}
    >
      <LogoMark width={size * 0.85} height={loadFactor * size} />
    </View>
  );
}
