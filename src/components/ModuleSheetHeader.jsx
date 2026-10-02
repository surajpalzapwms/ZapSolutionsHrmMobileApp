// src/components/ModuleSheetHeader.jsx — purple gradient header with the corner logo.
import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CornerLogo from "./CornerLogo";
import { colors, radius } from "../theme/colors";

const LOGO_SIZE = 64;
const HEADER_HEIGHT = LOGO_SIZE * 0.75;

export default function ModuleSheetHeader({ title, subtitle, right }) {
  return (
    <LinearGradient
      colors={[colors.headerFrom, colors.headerTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: "relative",
        height: HEADER_HEIGHT,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        paddingLeft: LOGO_SIZE + 12,
        paddingRight: 18,
        justifyContent: "center",
      }}
    >
      <CornerLogo size={LOGO_SIZE} loadFactor={0.4} height={HEADER_HEIGHT} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
        }}
      >
        <View style={{ flex: 1, marginRight: right ? 12 : 0 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}
