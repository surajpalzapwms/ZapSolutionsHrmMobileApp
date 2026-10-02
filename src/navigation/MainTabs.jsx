// src/navigation/MainTabs.jsx
// Home | Attendance | (raised clock-in button) | Activity | Profile —
// the same bottom bar as the testing app. Every other module (Payroll,
// Leave, Holidays, Staff, Advances, Expenses) opens from the Home grid.
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AttendanceProvider } from "../contexts/AttendanceContext";
import BottomTabBar from "../components/BottomTabBar";

import HomeScreen from "../screens/HomeScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import ActivityScreen from "../screens/ActivityScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <AttendanceProvider>
      <Tab.Navigator
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.screen } }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </AttendanceProvider>
  );
}
