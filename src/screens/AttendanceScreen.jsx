// src/screens/AttendanceScreen.jsx — gradient header + month / year calendar.
// Admin / super-admin get a staff picker on top, so they can open ANY staff
// member's calendar, salary and month summary (or their own, if they have a
// staff profile).
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useAttendance } from "../contexts/AttendanceContext";
import { useAuth } from "../contexts/AuthContext";
import ModuleSheetHeader from "../components/ModuleSheetHeader";
import AttendanceCalendar, { clearAttendanceCache } from "../components/AttendanceCalendar";
import { colors, radius, shadow } from "../theme/colors";
import { formatClock, formatShortDate, totalHours } from "../utils/format";
import { durationLabel } from "../components/OfficeDayTimeline";
import AttendanceNotifications from "../components/AttendanceNotifications";
import StaffPicker, { clearStaffCache, staffKeyOf, staffNameOf, useAllStaff } from "../components/StaffPicker";

export default function AttendanceScreen() {
  const { attendance, refresh, autoMode, officeDay, presence } = useAttendance();
  const { hasLeft, myProfile, isAdmin, isSuperAdmin } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  // Admin: which staff member is on screen (null = my own calendar).
  const { staff: allStaff, error: staffError, reload: reloadStaff } = useAllStaff(isAdmin);
  const [viewStaff, setViewStaff] = useState(null);
  // An admin account with no staff profile of its own starts on the first
  // staff member instead of an empty "no profile" calendar.
  useEffect(() => {
    if (isAdmin && (!myProfile || isSuperAdmin) && !viewStaff && allStaff.length) setViewStaff(allStaff[0]);
  }, [isAdmin, isSuperAdmin, myProfile, viewStaff, allStaff]);

  const onRefresh = async () => {
    setRefreshing(true);
    clearAttendanceCache(); // pull-to-refresh always goes back to the server
    if (isAdmin) {
      clearStaffCache();
      reloadStaff();
    }
    await refresh();
    setCalendarKey((k) => k + 1); // remount calendar so it refetches
    setRefreshing(false);
  };

  const live = !!attendance?.loginTime && !attendance?.logoutTime;

  return (
    <View style={{ flex: 1, backgroundColor: colors.track }}>
      <ModuleSheetHeader title="Attendance" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {hasLeft ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: "#FFF7ED",
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: "#FED7AA",
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9A3412" }}>
              Relieved on {formatShortDate(myProfile?.relievingDate) || "—"}
            </Text>
            <Text style={{ fontSize: 12, color: "#9A3412", marginTop: 2 }}>
              Your attendance history and month-wise salary are shown below. The Full &amp; Final Settlement is on
              Home.
            </Text>
          </View>
        ) : isSuperAdmin ? null : autoMode ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              ...shadow.soft,
            }}
          >
            {/* Only the times here. Wi-Fi / break details sit behind the 🔔
                (the number = how many updates today); tap it to see them. */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Col label="In time" value={formatClock(officeDay.firstIn)} />
              <View style={{ width: 1, alignSelf: "stretch", backgroundColor: colors.border }} />
              <Col label="Going time" value={formatClock(officeDay.goingTime)} />
              <View style={{ width: 1, alignSelf: "stretch", backgroundColor: colors.border }} />
              <Col label={officeDay.goingTime ? "In office" : "In office so far"} value={durationLabel(officeDay.insideMinutes)} />
              <View style={{ paddingLeft: 8 }}>
                <AttendanceNotifications day={officeDay} presence={presence} attendance={attendance} />
              </View>
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 14,
              ...shadow.soft,
            }}
          >
            <Col label="Clock in" value={formatClock(attendance?.loginTime)} />
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <Col label="Clock out" value={formatClock(attendance?.logoutTime)} />
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <Col
              label={live ? "Working…" : "Total"}
              value={totalHours(attendance?.loginTime, attendance?.logoutTime, live)}
            />
          </View>
        )}

        {isAdmin ? (
          <View style={{ marginHorizontal: 16, marginTop: 12 }}>
            <StaffPicker
              staff={allStaff}
              selected={viewStaff}
              onSelect={setViewStaff}
              extraOption={myProfile && !isSuperAdmin ? { label: "My attendance", sub: staffNameOf(myProfile) } : null}
            />
            {staffError ? (
              <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{staffError}</Text>
            ) : null}
          </View>
        ) : null}

        {isAdmin && viewStaff ? (
          <AttendanceCalendar
            key={`${staffKeyOf(viewStaff)}-${calendarKey}`}
            staffId={staffKeyOf(viewStaff)}
            staff={viewStaff}
          />
        ) : isSuperAdmin ? (
          <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 24 }}>
            {staffError ? "" : "Loading staff…"}
          </Text>
        ) : (
          <AttendanceCalendar key={`me-${calendarKey}`} />
        )}
      </ScrollView>
    </View>
  );
}

function Col({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
