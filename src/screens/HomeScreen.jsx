// src/screens/HomeScreen.jsx — same layout as the testing app's Home:
// gradient header, today's attendance card, birthday/holiday banner and a
// quick-action grid that opens each module in a slide-up sheet.
import React, { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";
import { useAttendance } from "../contexts/AttendanceContext";
import BirthdayBanner from "../components/BirthdayBanner";
import CornerLogo from "../components/CornerLogo";
import QuickActionSheet from "../components/QuickActionSheet";
import { colors, radius, shadow } from "../theme/colors";
import { formatClock } from "../utils/format";
import { getInitials } from "../utils/helpers";
import OfficeWifiCard from "../components/OfficeWifiCard";

import PayrollScreen from "./PayrollScreen";
import LeaveRequestsScreen from "./LeaveRequestsScreen";
import HolidaysListScreen from "./HolidaysListScreen";
import StaffListScreen from "./StaffListScreen";
import AdvanceListScreen from "./AdvanceListScreen";
import ExpensesListScreen from "./ExpensesListScreen";
import { SettlementCard, SettlementStatement } from "../components/Settlement";

const BG = {
  indigo: "#E0E7FF",
  pink: "#FCE7F3",
  amber: "#FEF3C7",
  emerald: "#D1FAE5",
};

// `sheet` actions open in the slide-up sheet; `tab` actions jump to a tab.
//   adminOnly  → only admin / super-admin (a promoted admin also needs the
//                matching `tabKey` permission, same as the website sidebar)
//   hideIfLeft → hidden for a staff member who has left the organization
const QUICK_ACTIONS = [
  { key: "Payroll", label: "Payroll", emoji: "💰", bg: BG.indigo, sheet: PayrollScreen },
  { key: "Leave", label: "Leave", emoji: "⏰", bg: BG.pink, sheet: LeaveRequestsScreen, hideIfLeft: true },
  { key: "Attendance", label: "Attendance", emoji: "📅", bg: BG.amber, tab: "Attendance" },
  { key: "Holiday", label: "Holiday", emoji: "🏖️", bg: BG.emerald, sheet: HolidaysListScreen, hideIfLeft: true },
  // Staff: every admin and super-admin sees ALL staff with full details.
  { key: "Staff", label: "Staff", emoji: "👥", bg: BG.indigo, sheet: StaffListScreen, adminOnly: true, allAdmins: true },
  { key: "Advances", label: "Advances", emoji: "💵", bg: BG.pink, sheet: AdvanceListScreen },
  { key: "Expenses", label: "Expenses", emoji: "🧾", bg: BG.amber, sheet: ExpensesListScreen, adminOnly: true, tabKey: "expenses" },
  { key: "Activity", label: "Activity", emoji: "⏳", bg: BG.emerald, tab: "Activity", hideIfLeft: true },
  { key: "Settlement", label: "Settlement", emoji: "📄", bg: BG.indigo, sheet: SettlementStatement, onlyIfLeft: true },
];

export default function HomeScreen({ navigation }) {
  const { user, isAdmin, canAccess, hasLeft, myProfile } = useAuth();
  const {
    attendance,
    loading,
    refreshing,
    actionLoading,
    error,
    hasClockedIn,
    hasClockedOut,
    refresh,
    clockIn,
    clockOut,
    presence,
  } = useAttendance();
  const [openKey, setOpenKey] = useState(null);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.screen }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const name = user?.name || "there";
  const attendDisabled = actionLoading || (hasClockedIn && hasClockedOut);
  const actions = QUICK_ACTIONS.filter((a) => {
    if (a.adminOnly && !(isAdmin && (a.allAdmins || canAccess(a.tabKey)))) return false;
    if (a.hideIfLeft && hasLeft) return false;
    if (a.onlyIfLeft && !hasLeft) return false;
    return true;
  });
  const open = actions.find((a) => a.key === openKey);
  const SheetContent = open?.sheet;

  const onAction = (action) => {
    if (action.tab) navigation.navigate(action.tab);
    else setOpenKey(action.key);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.headerFrom, colors.headerTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "relative",
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 20,
          }}
        >
          <CornerLogo size={64} loadFactor={0.4} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{user?.name}</Text>
              <View
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.18)",
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.5)",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{getInitials(user?.name)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff", marginTop: 6 }}>
            Welcome back, {name.split(" ")[0]}! 👋
          </Text>
        </LinearGradient>

        {hasLeft ? (
          /* Left the organization: no clock in/out, no upcoming holidays /
             birthdays — the Full & Final Settlement takes their place. */
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
            <SettlementCard staff={myProfile} onPreview={() => setOpenKey("Settlement")} />
          </View>
        ) : (
          <>
            {/* Today's attendance */}
            <View style={{ marginHorizontal: 16, marginTop: 8 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow.card }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Today&apos;s attendance</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Activity")}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>View all ›</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TimeBox label="Clock in" value={formatClock(attendance?.loginTime)} />
                  <TimeBox label="Clock out" value={formatClock(attendance?.logoutTime)} />
                  <TouchableOpacity
                    disabled={attendDisabled}
                    onPress={hasClockedIn ? clockOut : clockIn}
                    activeOpacity={0.85}
                    style={{
                      width: 92,
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hasClockedIn ? colors.danger : colors.primary,
                      opacity: attendDisabled ? 0.5 : 1,
                    }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                        {hasClockedIn ? (hasClockedOut ? "Done" : "Clock out") : "Clock in"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {!isAdmin ? <AutoAttendanceLine presence={presence} attendance={attendance} /> : null}

                {error ? (
                  <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "500", color: colors.danger }}>{error}</Text>
                ) : null}
              </View>
            </View>

            {isAdmin ? (
              <View style={{ marginHorizontal: 16, marginTop: 16 }}>
                <OfficeWifiCard />
              </View>
            ) : null}

            {/* Birthdays / holidays */}
            <View style={{ marginHorizontal: 16, marginTop: 16 }}>
              <BirthdayBanner user={user} />
            </View>
          </>
        )}

        {/* Quick actions grid */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 24,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-start",
          }}
        >
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={{ width: "25%", alignItems: "center", marginBottom: 16 }}
              onPress={() => onAction(action)}
              activeOpacity={0.7}
            >
              <View
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: action.bg,
                  ...shadow.soft,
                }}
              >
                <Text style={{ fontSize: 18 }}>{action.emoji}</Text>
              </View>
              <Text style={{ marginTop: 4, textAlign: "center", fontSize: 11, color: "#4B5563" }}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <QuickActionSheet
        visible={!!SheetContent}
        title={open?.key === "Settlement" ? "Full & Final Settlement" : open?.label || ""} onClose={() => setOpenKey(null)}>
        {SheetContent ? <SheetContent /> : null}
      </QuickActionSheet>
    </View>
  );
}

function TimeBox({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.track, borderRadius: radius.md, padding: 10 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

// One line under the clock-in card explaining what automatic attendance is
// doing: on office Wi-Fi, away since HH:MM, or signed out automatically.
function AutoAttendanceLine({ presence, attendance }) {
  let text = "Checking office Wi-Fi…";
  let color = "#6B7280";
  if (attendance?.autoSignedOut && attendance?.logoutTime) {
    text = `Signed out automatically at ${formatClock(attendance.logoutTime)}`;
  } else if (attendance?.lastDisconnectAt && !attendance?.logoutTime) {
    text = `Left office Wi-Fi at ${formatClock(attendance.lastDisconnectAt)} — reconnect to continue`;
    color = "#B45309";
  } else if (presence) {
    if (!presence.officeNetworkConfigured) {
      text = "Office Wi-Fi not set up yet — ask your admin";
      color = "#B45309";
    } else if (presence.inOffice && presence.reason) {
      text = presence.reason; // e.g. "Cannot sign in on <holiday>"
      color = "#B45309";
    } else if (presence.inOffice) {
      text = "On office Wi-Fi — attendance is automatic";
      color = "#047857";
    } else {
      text = `Not on office Wi-Fi${presence.ip ? ` (${presence.ip})` : ""} — use Clock in if you are working`;
    }
  }
  return <Text style={{ marginTop: 10, fontSize: 11.5, fontWeight: "600", color }}>📶 {text}</Text>;
}
