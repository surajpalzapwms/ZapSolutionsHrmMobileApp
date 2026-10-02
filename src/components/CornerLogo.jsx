// src/components/CornerLogo.jsx — white logo tab pinned to a header's top-left corner.
import React from "react";
import { Image, View } from "react-native";
import { shadow } from "../theme/colors";

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
        <Image
          source={require("../../assets/zap-logo.png")}
          resizeMode="contain"
          style={{ width: "80%", height: loadFactor * size }}
        />
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
      <Image
        source={require("../../assets/zap-logo.png")}
        resizeMode="contain"
        style={{ width: "85%", height: loadFactor * size }}
      />
    </View>
  );
}
