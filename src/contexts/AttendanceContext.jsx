// src/contexts/AttendanceContext.jsx
// Single source of truth for "am I clocked in today". Shared by the Home card,
// the raised button in the tab bar, Activity and Profile so they never drift.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { attendanceService } from "../services/attendanceService";
import { unwrapList } from "../utils/helpers";
import { useAuth } from "./AuthContext";
import { openAllowAllTheTime, usePresence } from "../presence/usePresence";
import { summarizeDay, useOfficeDay } from "../presence/officeSession";

const AttendanceContext = createContext(null);

// Backend returns { success, attendance: { loginTime, logoutTime } }; older
// builds used { data: { checkIn, checkOut } }. Normalise both.
function normalizeToday(payload) {
  const rec = payload?.attendance ?? payload?.data ?? null;
  if (!rec || typeof rec !== "object") return null;
  return {
    ...rec,
    loginTime: rec.loginTime ?? rec.checkIn ?? null,
    logoutTime: rec.logoutTime ?? rec.checkOut ?? null,
  };
}

export function AttendanceProvider({ children }) {
  const { isAdmin, hasLeft } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);
    // Left the organization: no clock in / out any more, nothing to load.
    if (hasLeft) {
      setAttendance(null);
      setList([]);
      return;
    }
    try {
      const mine = await attendanceService.getMyTodayAttendance();
      setAttendance(normalizeToday(mine.data));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load today's attendance.");
    }
    // "Who's in today" is admin-only on the backend — skip it for staff.
    if (!isAdmin) {
      setList([]);
      return;
    }
    try {
      const today = await attendanceService.getTodayAttendanceList();
      let records = unwrapList(today.data);
      // Older servers return userId as a bare id (no name). Fill names in
      // from the "open today" endpoint, which does include them.
      if (records.some((r) => r.userId && typeof r.userId !== "object")) {
        const names = {};
        try {
          const open = await attendanceService.getOpenAttendanceToday();
          unwrapList(open.data).forEach((o) => {
            if (o.userId) names[String(o.userId)] = o.name;
          });
        } catch {
          // names stay unknown
        }
        records = records.map((r) =>
          r.userId && typeof r.userId !== "object"
            ? { ...r, userId: { _id: r.userId, name: names[String(r.userId)] || "Staff member", role: "" } }
            : r
        );
      }
      setList(records);
    } catch {
      setList([]);
    }
  }, [isAdmin, hasLeft]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Automatic attendance from office Wi-Fi (staff only — admins are never
  // auto-signed in/out, same as the backend).
  const autoEnabled = !isAdmin && !hasLeft;
  const { presence, autoMode, refreshPermission } = usePresence({
    enabled: autoEnabled,
    onAttendanceChanged: loadData,
  });

  // Today's in / out / back log + going time, refreshed every minute so the
  // "out for 12 min" and the worked time keep moving.
  const officeLog = useOfficeDay();
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const officeDay = useMemo(
    () => summarizeDay(officeLog, attendance, nowTick),
    [officeLog, attendance, nowTick],
  );

  const enableAutoMode = useCallback(async () => {
    await openAllowAllTheTime();
    await refreshPermission();
  }, [refreshPermission]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const runAction = useCallback(
    async (fn, failMsg) => {
      if (hasLeft) return;
      setActionLoading(true);
      setError(null);
      try {
        const res = await fn();
        const rec = normalizeToday(res.data);
        if (rec) setAttendance(rec);
        await loadData();
      } catch (e) {
        setError(e.response?.data?.message || failMsg);
      } finally {
        setActionLoading(false);
      }
    },
    [loadData, hasLeft]
  );

  const clockIn = useCallback(() => runAction(attendanceService.signIn, "Clock in failed."), [runAction]);
  const clockOut = useCallback(() => runAction(attendanceService.signOut, "Clock out failed."), [runAction]);

  const hasClockedIn = !!attendance?.loginTime;
  const hasClockedOut = !!attendance?.logoutTime;
  const toggleClock = useCallback(
    () => (hasClockedIn ? clockOut() : clockIn()),
    [hasClockedIn, clockIn, clockOut]
  );

  // Memoised so screens only re-render when attendance data really changes.
  const value = useMemo(
    () => ({
      attendance,
      list,
      loading,
      refreshing,
      actionLoading,
      error,
      hasClockedIn,
      hasClockedOut,
      refresh,
      clockIn,
      clockOut,
      toggleClock,
      canClock: !hasLeft,
      presence,
      // Fully automatic attendance ("Allow all the time" given, staff only):
      // the screens hide the Clock in / Clock out buttons.
      autoMode: autoEnabled && autoMode,
      enableAutoMode,
      officeDay,
    }),
    [attendance, list, loading, refreshing, actionLoading, error, hasClockedIn, hasClockedOut, refresh, clockIn, clockOut, toggleClock, hasLeft, presence, autoEnabled, autoMode, enableAutoMode, officeDay],
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error("useAttendance must be used within an AttendanceProvider");
  return ctx;
}
