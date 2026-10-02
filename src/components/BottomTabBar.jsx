// src/components/BottomTabBar.jsx
// Custom tab bar for React Navigation that matches the testing app:
// two tabs, a raised round clock-in/out button in the middle, two tabs.
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAttendance } from "../contexts/AttendanceContext";

const TAB_META = {
  Home: { label: "Home", emoji: "🏠" },
  Attendance: { label: "Attendance", emoji: "📅" },
  Activity: { label: "Activity", emoji: "⏳" },
  Profile: { label: "Profile", emoji: "👤" },
};

function TabButton({ label, emoji, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, minWidth: 56 }}
    >
      <Text style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 11,
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
  const { hasClockedIn, hasClockedOut, actionLoading, toggleClock, canClock } = useAttendance();
  const attendDisabled = actionLoading || (hasClockedIn && hasClockedOut);

  const renderTab = (route, index) => {
    const meta = TAB_META[route.name] || { label: route.name, emoji: "•" };
    const active = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!active && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return <TabButton key={route.key} label={meta.label} emoji={meta.emoji} active={active} onPress={onPress} />;
  };

  const half = Math.ceil(state.routes.length / 2);
  const left = state.routes.slice(0, half);
  const right = state.routes.slice(half);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {left.map((r, i) => renderTab(r, i))}

      {/* Raised centre button — clocks in / out. Hidden (spacer kept so the
          tabs stay put) once the staff member has left the organization. */}
      {!canClock ? (
        <View style={{ width: 56 }} />
      ) : (
        <TouchableOpacity
          disabled={attendDisabled}
          onPress={toggleClock}
          activeOpacity={0.85}
          style={{
            marginTop: -32,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#4F46E5",
            opacity: attendDisabled ? 0.5 : 1,
            shadowColor: "#4F46E5",
            shadowOpacity: 0.4,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          {actionLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 20, color: "#fff" }}>{hasClockedIn ? "⏻" : "👆"}</Text>
          )}
        </TouchableOpacity>
      )}

      {right.map((r, i) => renderTab(r, i + half))}
    </View>
  );
}

