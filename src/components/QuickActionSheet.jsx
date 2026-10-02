// src/components/QuickActionSheet.jsx — full-height sheet used for every Home quick action.
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ModuleSheetHeader from "./ModuleSheetHeader";
import { colors } from "../theme/colors";

export default function QuickActionSheet({ visible, title, onClose, children }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ModuleSheetHeader
          title={title}
          right={
            <TouchableOpacity
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.5)",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          }
        />
        <View style={{ flex: 1, backgroundColor: colors.screen }}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}
