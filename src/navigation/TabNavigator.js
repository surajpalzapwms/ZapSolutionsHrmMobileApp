import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "../theme/colors";
import HomeScreen from "../screens/HomeScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: "home",
  Analytic: "stats-chart",
  Activity: "time",
  Profile: "person",
};

// Raised center action button ("Attend").
function AttendButton({ children, onPress }) {
  return (
    <TouchableOpacity style={styles.attendWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.attendBtn}>{children}</View>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ color, size }) =>
          ICONS[route.name] ? (
            <Ionicons name={ICONS[route.name]} size={size} color={color} />
          ) : null,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Analytic" component={AnalyticsScreen} />
      <Tab.Screen
        name="Attend"
        component={PlaceholderScreen}
        initialParams={{ title: "Attend" }}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <Ionicons name="finger-print" size={26} color="#fff" />
          ),
          tabBarButton: (props) => <AttendButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={PlaceholderScreen}
        initialParams={{ title: "Activity" }}
      />
      <Tab.Screen
        name="Profile"
        component={PlaceholderScreen}
        initialParams={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: colors.card,
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadow.card,
  },
  label: { fontSize: 11, fontWeight: "600" },
  attendWrap: {
    top: -22,
    justifyContent: "center",
    alignItems: "center",
  },
  attendBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.card,
    ...shadow.card,
  },
});
