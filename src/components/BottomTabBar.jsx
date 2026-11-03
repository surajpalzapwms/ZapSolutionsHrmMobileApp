// src/components/BottomTabBar.jsx
// Custom tab bar for React Navigation: five equal tabs in ONE row —
// Home | Attendance | Salary Slip | Activity | Profile.
// (The old raised round button in the middle has been removed; Salary Slip
// is now a normal tab like the others.)
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_META = {
  Home: { label: "Home", emoji: "🏠" },
  Attendance: { label: "Attendance", emoji: "📅" },
  SalarySlip: { label: "Salary Slip", emoji: "📄" },
  Activity: { label: "Activity", emoji: "⏳" },
  Profile: { label: "Profile", emoji: "👤" },
};

function TabButton({ label, emoji, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
    >
      <Text style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>{emoji}</Text>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10.5,
          fontWeight: active ? "600" : "400",
          color: active ? "#4F46E5" : "#9CA3AF",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingHorizontal: 4,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] || { label: route.name, emoji: "•" };
        const active = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return <TabButton key={route.key} label={meta.label} emoji={meta.emoji} active={active} onPress={onPress} />;
      })}
    </View>
  );
}
