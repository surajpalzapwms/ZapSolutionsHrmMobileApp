// src/hooks/useMySalary.js
// Mobile port of the website's useMySalary
// (frontend/src/components/attendance/hooks/useMySalary.js). Read-only: it
// only asks for the logged-in staff member's own records (`employeeId` =
// their own Staff _id from /api/staff/me — the backend also enforces this
// for non-admins).
//
// Month figures follow the same rules as the website:
//   • a saved Payroll doc is shown, recalculated live when possible so a
//     later calendar change is reflected (saved amount kept for comparison)
//   • a past/current month with no saved payroll shows a live estimate
//   • months before joining, after the last working day, or in the future
//     are skipped
//
// Speed:
//   • the year's saved payroll list is fetched ONCE per year and shared by
//     every month (not re-fetched on each month change)
//   • saved figures are shown immediately; live recalculations fill in as
//     they arrive
//   • everything is cached for the session (cleared on pull-to-refresh)
import { useCallback, useEffect, useState } from "react";
import { payrollService } from "../services/payrollService";
import { advanceService } from "../services/advanceService";
import { unwrapList } from "../utils/helpers";

const EMPTY = {};
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// ── Session caches ───────────────────────────────────────────────────────
const savedPayrollCache = new Map(); // "emp|year" -> Promise<{ [month]: rec }>
const monthFigureCache = new Map(); // "emp|year" -> { [month]: figure }
const advancesCache = new Map(); // emp -> Promise<grouped>

export function clearSalaryCache() {
  savedPayrollCache.clear();
  monthFigureCache.clear();
  advancesCache.clear();
}

function loadSavedPayroll(employeeId, year) {
  const key = `${employeeId}|${year}`;
  if (!savedPayrollCache.has(key)) {
    const p = payrollService
      .getAll({ employeeId, periodFrom: `${year}-01`, periodTo: `${year}-12` })
      .then((res) => {
        const byMonth = {};
        unwrapList(res.data).forEach((rec) => {
          // Defensive: never show another person's payroll.
          const recEmp = rec.employeeId?._id || rec.employeeId;
          if (recEmp && !sameId(recEmp, employeeId)) return;
          const [py, pm] = String(rec.period || "").split("-").map(Number);
          if (py !== year) return;
          const m = pm - 1;
          if (!(m >= 0 && m <= 11)) return;
          byMonth[m] = {
            ...rec,
            payableDays: rec.attendanceInfo?.payableDays,
            totalDays: rec.attendanceInfo?.totalWorkingDays,
            unpaidDays: rec.attendanceInfo?.unpaidLeaves,
          };
        });
        return byMonth;
      })
      .catch(() => {
        savedPayrollCache.delete(key);
        return {};
      });
    savedPayrollCache.set(key, p);
  }
  return savedPayrollCache.get(key);
}

function liveFigure(saved, data) {
  if (saved) {
    const live =
      Number(data.netSalary || 0) -
      Number(saved.advanceDeduction || 0) +
      Number(saved.totalAllowance || 0) -
      Number(saved.totalDeduction || 0);
    const liveRounded = Math.round(Math.max(0, live) * 100) / 100;
    const savedNet = Number(saved.netSalary || 0);
    return {
      ...saved,
      netSalary: liveRounded,
      savedNetSalary: savedNet,
      differsFromSaved: Math.abs(liveRounded - savedNet) >= 0.01,
      payableDays: data.payableDays,
      totalDays: data.totalDaysInMonth,
      unpaidDays: data.unpaidLeaveDays,
    };
  }
  return {
    netSalary: data.finalSalary ?? data.netSalary,
    isEstimate: true,
    payableDays: data.payableDays,
    totalDays: data.totalDaysInMonth,
    unpaidDays: data.unpaidLeaveDays,
  };
}

export function useMySalary(employeeId, year, joinKey, relieveKey = null) {
  const cacheKey = `${employeeId}|${year}`;
  // Figures are read straight from the session cache, so a year you already
  // opened shows instantly; `tick` re-renders as new figures land.
  const [, setTick] = useState(0);
  const salaryByMonth = monthFigureCache.get(cacheKey) || EMPTY;
  const [loadingCount, setLoadingCount] = useState(0);
  const salaryLoading = loadingCount > 0;

  // `onlyMonth` (0-11) refreshes just that month (Month view); omit it to
  // load the whole year (Annual view).
  const loadSalary = useCallback(
    async (onlyMonth = null) => {
      if (!employeeId) return;
      const key = `${employeeId}|${year}`;
      const merge = (patch) => {
        monthFigureCache.set(key, { ...(monthFigureCache.get(key) || {}), ...patch });
        setTick((t) => t + 1);
      };
      setLoadingCount((c) => c + 1);
      try {
        const now = new Date();
        const joinYear = joinKey ? Number(joinKey.slice(0, 4)) : null;
        const joinMonth = joinKey ? Number(joinKey.slice(5, 7)) - 1 : null;
        const endYear = relieveKey ? Number(relieveKey.slice(0, 4)) : null;
        const endMonth = relieveKey ? Number(relieveKey.slice(5, 7)) - 1 : null;
        const months = Array.from({ length: 12 }, (_, m) => m).filter((m) => {
          if (onlyMonth !== null && m !== onlyMonth) return false;
          if (year > now.getFullYear()) return false;
          if (year === now.getFullYear() && m > now.getMonth()) return false;
          if (joinYear != null && (year < joinYear || (year === joinYear && m < joinMonth))) return false;
          if (endYear != null && (year > endYear || (year === endYear && m > endMonth))) return false;
          return true;
        });
        if (!months.length) return;

        const saved = await loadSavedPayroll(employeeId, year);

        // 1) Saved payroll first — shows straight away (unless a live figure
        //    is already cached for that month).
        const cached = monthFigureCache.get(key) || {};
        const quick = {};
        months.forEach((m) => {
          if (!cached[m] && saved[m]) quick[m] = saved[m];
        });
        if (Object.keys(quick).length) merge(quick);

        // 2) Live recalculation for each month, filled in as each arrives.
        await Promise.allSettled(
          months.map((m) =>
            payrollService
              .calculate(employeeId, `${year}-${String(m + 1).padStart(2, "0")}`)
              .then((r) => {
                const data = r.data?.data || r.data;
                if (data) merge({ [m]: liveFigure(saved[m], data) });
              }),
          ),
        );
      } finally {
        setLoadingCount((c) => Math.max(0, c - 1));
      }
    },
    [employeeId, year, joinKey, relieveKey],
  );

  // Advances grouped by "YYYY-M" (month 0-11); rejected ones ignored.
  const [advancesState, setAdvancesState] = useState({ emp: null, grouped: EMPTY });
  useEffect(() => {
    if (!employeeId) return undefined;
    let cancelled = false;
    if (!advancesCache.has(employeeId)) {
      advancesCache.set(
        employeeId,
        advanceService
          .getAll({ employeeId })
          .then((res) => {
            const grouped = {};
            unwrapList(res.data)
              .filter((a) => a.status !== "rejected")
              .filter((a) => sameId(a.employeeId?._id || a.employeeId, employeeId))
              .forEach((a) => {
                const d = new Date(a.date);
                if (Number.isNaN(d.getTime())) return;
                const k = `${d.getFullYear()}-${d.getMonth()}`;
                (grouped[k] = grouped[k] || []).push(a);
              });
            Object.values(grouped).forEach((arr) => arr.sort((x, y) => new Date(x.date) - new Date(y.date)));
            return grouped;
          })
          .catch(() => {
            advancesCache.delete(employeeId);
            return {};
          }),
      );
    }
    advancesCache.get(employeeId).then((grouped) => {
      if (!cancelled) setAdvancesState({ emp: employeeId, grouped });
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);
  const advancesLoading = !!employeeId && advancesState.emp !== employeeId;
  const advancesByMonth = advancesLoading ? EMPTY : advancesState.grouped;

  return { salaryByMonth, salaryLoading, loadSalary, advancesByMonth, advancesLoading };
}
