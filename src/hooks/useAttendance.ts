import { useCallback, useEffect, useState } from 'react';

import {
  clockIn as apiClockIn,
  clockOut as apiClockOut,
  getMyTodayAttendance,
  getTodayAttendanceList,
} from '../../services/api';
import type { AttendanceRecord, TodayAttendanceEntry } from '../../services/api';

// Single source of truth for "am I clocked in today" — used by both the
// HomeScreen card and the raised Attend button in the bottom tab bar, so
// tapping either one keeps the other in sync instead of drifting apart.
export function useAttendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord>(null);
  const [list, setList] = useState<TodayAttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [mine, today] = await Promise.all([getMyTodayAttendance(), getTodayAttendanceList()]);
      setAttendance(mine.attendance);
      setList(today.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const clockIn = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await apiClockIn();
      setAttendance(res.attendance);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock in failed');
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

  const clockOut = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await apiClockOut();
      setAttendance(res.attendance);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock out failed');
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

  const hasClockedIn = !!attendance?.loginTime;
  const hasClockedOut = !!attendance?.logoutTime;

  return {
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
  };
}
