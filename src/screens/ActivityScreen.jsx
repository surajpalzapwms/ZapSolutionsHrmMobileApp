// src/screens/ActivityScreen.jsx — who's in today + my leave requests.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useAttendance } from "../contexts/AttendanceContext";
import { useAuth } from "../contexts/AuthContext";
import AdminLeaveRequests from "../components/AdminLeaveRequests";
import { attendanceService } from "../services/attendanceService";
import ModuleSheetHeader from "../components/ModuleSheetHeader";
import AttendanceRow from "../components/AttendanceRow";
import LeaveRequestsList, { groupLeaves } from "../components/LeaveRequestsList";
import { Card, SectionTitle } from "../components/ModuleUI";
import { colors } from "../theme/colors";
import { formatTime, totalHours } from "../utils/format";
import { unwrapList } from "../utils/helpers";

export default function ActivityScreen() {
  const { isAdmin, hasLeft } = useAuth();
  const { list, refresh } = useAttendance();
  const [adminKey, setAdminKey] = useState(0);
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [leavesError, setLeavesError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaves = useCallback(async () => {
    if (isAdmin) {
      setLeavesLoading(false);
      return;
    }
    try {
      setLeavesError("");
      const res = await attendanceService.getMyLeaveRequests();
      setLeaves(groupLeaves(unwrapList(res.data)));
    } catch (e) {
      setLeavesError(e.response?.data?.message || "Failed to load leave requests.");
    } finally {
      setLeavesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadLeaves()]);
    setAdminKey((k) => k + 1);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ModuleSheetHeader title="Activity" />

      <ScrollView
        style={{ paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {isAdmin ? (
        <>
        <SectionTitle>Today&apos;s Attendance</SectionTitle>
        <Card style={{ marginBottom: 18, padding: 18 }}>
          {list.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textMuted }}>No one has clocked in yet today.</Text>
          ) : (
            list.map((entry, idx) => {
              const person = entry.userId && typeof entry.userId === "object" ? entry.userId : null;
              return (
                <AttendanceRow
                  key={entry._id || idx}
                  name={person?.name || entry.name || "Unknown"}
                  role={(person?.role || "").replace("-", " ")}
                  time={formatTime(entry.loginTime)}
                  late={!entry.logoutTime}
                />
              );
            })
          )}
        </Card>
        </>
        ) : hasLeft ? null : (
          <MyTodayCard />
        )}

        <SectionTitle style={{ marginTop: 8 }}>
          {isAdmin ? "Pending Leave Requests" : "My Leave Requests"}
        </SectionTitle>
        <Card style={{ marginBottom: 18, padding: 18 }}>
          {isAdmin ? (
            <AdminLeaveRequests key={adminKey} onlyPending />
          ) : leavesLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : leavesError ? (
            <Text style={{ fontSize: 13, color: colors.danger }}>{leavesError}</Text>
          ) : (
            <LeaveRequestsList leaves={leaves} />
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

// Staff can't see everyone's attendance, so show their own day instead.
function MyTodayCard() {
  const { attendance } = useAttendance();
  const live = !!attendance?.loginTime && !attendance?.logoutTime;
  return (
    <>
      <SectionTitle>My Attendance Today</SectionTitle>
      <Card style={{ marginBottom: 18, padding: 18 }}>
        {attendance?.loginTime ? (
          <View style={{ flexDirection: "row" }}>
            {[
              ["Clock in", formatTime(attendance.loginTime)],
              ["Clock out", formatTime(attendance.logoutTime)],
              [live ? "Working…" : "Total", totalHours(attendance.loginTime, attendance.logoutTime, live)],
            ].map(([label, value]) => (
              <View key={label} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{value}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            You haven&apos;t clocked in yet today.
          </Text>
        )}
      </Card>
    </>
  );
}
