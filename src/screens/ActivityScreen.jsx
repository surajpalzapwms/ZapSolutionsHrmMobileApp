// src/screens/ActivityScreen.jsx
// Activity tab: Today's Attendance + Leave Requests.
//
// FIX (3 Nov 2026):
//  - The screen was empty because it called endpoints that do not exist on the backend
//    (/api/attendance/today, /api/leaves ...). It now uses the app's real services
//    (attendanceService + AttendanceContext), the same calls Home and Leave already use.
//  - Shows only the LATEST record in each section, with all of its details.
//    Change SHOW_COUNT to 2 to show two records. "View all" opens the rest.
//  - A multi-day request (one server row per day) is still shown as ONE card;
//    Approve / Reject updates every day of it.

import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ModuleSheetHeader from "../components/ModuleSheetHeader";
import { Badge } from "../components/ModuleUI";
import {
  DetailRow,
  LeaveDetail,
  SectionHeader,
  activityStyles as styles,
  confirmLeaveDecision,
  groupLeaveRequests as groupLeaves,
  idOf,
  nameOf,
  roleOf,
  staffCodeOf,
} from "../components/LeaveActivityCards";
import { attendanceService } from "../services/attendanceService";
import { useAuth } from "../contexts/AuthContext";
import { useAttendance } from "../contexts/AttendanceContext";
import { colors } from "../theme/colors";
import { formatClock, formatShortDate, totalHours } from "../utils/format";
import { unwrapList } from "../utils/helpers";

// How many records to show in each section (1 or 2).
const SHOW_COUNT = 1;

// Leave cards, helpers and styles are shared with the Leave module
// (components/LeaveActivityCards.jsx) so both screens look the same.
const loginOf = (r) => r?.loginTime || r?.checkIn || r?.clockIn || null;
const logoutOf = (r) => r?.logoutTime || r?.checkOut || r?.clockOut || null;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function ActivityScreen() {
  const { isAdmin, isSuperAdmin, isViewOnly } = useAuth();
  const att = useAttendance();

  const [leaves, setLeaves] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [showAllAtt, setShowAllAtt] = useState(false);
  const [showAllLeaves, setShowAllLeaves] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLeaveError("");
    try {
      const res = isAdmin
        ? await attendanceService.getPendingLeaveRequests()
        : await attendanceService.getMyLeaveRequests();
      let list = unwrapList(res.data);
      if (isAdmin) list = list.filter((l) => String(l.status || "pending").toLowerCase() === "pending");
      setLeaves(list);
    } catch (e) {
      setLeaveError(e.response?.data?.message || "Could not load leave requests.");
    } finally {
      setLeaveLoading(false);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadLeaves();
      att?.refresh?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadLeaves])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([loadLeaves(), att?.refresh?.()]);
    setRefreshing(false);
  };

  // Admin: everyone in today (latest first). Staff: their own record.
  const attendanceRows = useMemo(() => {
    if (isAdmin) {
      return [...(att?.list || [])].sort((a, b) => new Date(loginOf(b) || 0) - new Date(loginOf(a) || 0));
    }
    return att?.attendance && loginOf(att.attendance) ? [att.attendance] : [];
  }, [isAdmin, att?.list, att?.attendance]);

  const requests = useMemo(() => groupLeaves(leaves), [leaves]);

  const visibleAtt = showAllAtt ? attendanceRows : attendanceRows.slice(0, SHOW_COUNT);
  const visibleReq = showAllLeaves ? requests : requests.slice(0, SHOW_COUNT);

  const decide = (g, approve) => confirmLeaveDecision(g, approve, { setBusyKey, onDone: loadLeaves });

  const attLoading = att?.loading && attendanceRows.length === 0;
  // Super admin has no attendance of their own; show the company's list instead (isAdmin covers it).
  const attTitle = isAdmin ? "Today's Attendance" : "My Attendance Today";
  const leaveTitle = isAdmin ? "Pending Leave Requests" : "My Leave Requests";

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ModuleSheetHeader title="Activity" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ---------- Today's Attendance ---------- */}
        <SectionHeader
          title={attTitle}
          count={attendanceRows.length}
          canToggle={attendanceRows.length > SHOW_COUNT}
          open={showAllAtt}
          onToggle={() => setShowAllAtt((v) => !v)}
        />
        <View style={styles.card}>
          {attLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 18 }} />
          ) : visibleAtt.length === 0 ? (
            <Text style={styles.empty}>
              {isAdmin ? "No one has clocked in yet today." : "You have not clocked in yet today."}
            </Text>
          ) : (
            visibleAtt.map((a, i) => (
              <AttendanceDetail key={idOf(a) || i} rec={a} divider={i > 0} showName={isAdmin || isSuperAdmin} />
            ))
          )}
        </View>

        {/* ---------- Leave Requests (one card per request) ---------- */}
        <SectionHeader
          title={leaveTitle}
          count={requests.length}
          canToggle={requests.length > SHOW_COUNT}
          open={showAllLeaves}
          onToggle={() => setShowAllLeaves((v) => !v)}
        />
        <View style={styles.card}>
          {leaveLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 18 }} />
          ) : leaveError ? (
            <Text style={[styles.empty, { color: colors.danger }]}>{leaveError}</Text>
          ) : visibleReq.length === 0 ? (
            <Text style={styles.empty}>{isAdmin ? "No pending leave requests." : "No leave requests yet."}</Text>
          ) : (
            visibleReq.map((g, i) => (
              <LeaveDetail
                key={g.key}
                g={g}
                divider={i > 0}
                showName={isAdmin}
                busy={busyKey === g.key}
                canDecide={isAdmin && !isViewOnly && g.status === "pending"}
                onApprove={() => decide(g, true)}
                onReject={() => decide(g, false)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function AttendanceDetail({ rec, divider, showName }) {
  const login = loginOf(rec);
  const logout = logoutOf(rec);
  const statusText = logout ? "Clocked out" : login ? "In office" : "Not in";
  const lateMin = Number(rec.lateMinutes || rec.lateBy || 0);
  return (
    <View style={[styles.item, divider && styles.divider]}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.name}>{showName ? nameOf(rec) : "Today"}</Text>
          {showName && (roleOf(rec) || staffCodeOf(rec)) ? (
            <Text style={styles.muted}>{[staffCodeOf(rec), roleOf(rec)].filter(Boolean).join(" · ")}</Text>
          ) : (
            <Text style={styles.muted}>{formatShortDate(rec.date || login || new Date())}</Text>
          )}
        </View>
        <Badge label={statusText} tone={logout ? "muted" : "success"} />
      </View>

      <View style={styles.timeRow}>
        <TimeBox label="Clock in" value={formatClock(login)} />
        <TimeBox label="Clock out" value={formatClock(logout)} />
        <TimeBox label="Worked" value={totalHours(login, logout, !logout)} />
      </View>

      <View style={{ marginTop: 10 }}>
        {showName ? <DetailRow label="Date" value={formatShortDate(rec.date || login)} /> : null}
        <DetailRow label="Status" value={rec.status ? String(rec.status) : null} />
        <DetailRow label="Late by" value={lateMin > 0 ? `${lateMin} min` : null} valueColor={colors.danger} />
        <DetailRow label="Marked" value={rec.auto || rec.isAuto ? "Automatic (office Wi-Fi)" : null} />
        <DetailRow label="Note" value={rec.reason || rec.remarks || rec.note} />
      </View>
    </View>
  );
}

function TimeBox({ label, value }) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
  );
}
