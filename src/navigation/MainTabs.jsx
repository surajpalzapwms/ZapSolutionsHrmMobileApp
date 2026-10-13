// src/navigation/MainTabs.jsx
// Home | Attendance | Salary Slip | Pending | Activity | Profile — six tabs
// in one row. Every other module (Payroll, Leave, Advances, Letters…) opens from
// the Home grid.
import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AttendanceProvider } from "../contexts/AttendanceContext";
import BottomTabBar from "../components/BottomTabBar";
import ModuleSheetHeader from "../components/ModuleSheetHeader";

import HomeScreen from "../screens/HomeScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import SalarySlipScreen from "../screens/SalarySlipScreen";
import ActivityScreen from "../screens/ActivityScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PendingSalaryScreen from "../screens/PendingSalaryScreen";
import { colors } from "../theme/colors";

// Salary Slip as a full tab: same purple header as Activity, then the list.
function SalarySlipTab() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ModuleSheetHeader title="Salary Slip" />
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        <SalarySlipScreen />
      </View>
    </View>
  );
}

// Pending Salary tab: same header, then unpaid / partly paid months.
function PendingSalaryTab() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ModuleSheetHeader title="Pending Salary" />
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        <PendingSalaryScreen />
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <AttendanceProvider>
      <Tab.Navigator
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.screen },
          // Each tab is built the first time you open it, and tabs you are
          // not looking at are frozen (no re-render in the background).
          lazy: true,
          freezeOnBlur: true,
          animation: "none",
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen name="SalarySlip" component={SalarySlipTab} />
        <Tab.Screen name="PendingSalary" component={PendingSalaryTab} />
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </AttendanceProvider>
  );
}
