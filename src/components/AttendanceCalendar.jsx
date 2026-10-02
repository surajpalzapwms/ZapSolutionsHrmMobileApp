import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { attendanceService } from "../services/attendanceService";
import { holidayService } from "../services/holidayService";
import { saturdayHolidayService } from "../services/saturdayHolidayService";
import { SHORT_DAYS, MONTHS } from "../utils/constants";
import { colors, radius, shadow } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import { useMySalary, clearSalaryCache } from "../hooks/useMySalary";
import { staffService } from "../services/staffService";
import { dateKeyFrom, hasLeftOrganization } from "../utils/staffStatus";
import MonthSummary from "./MonthSummary";

const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

// "₹26,500" — compact amount for the small annual month headers.
const shortMoney = (v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

const STATUS_COLORS = {
  present: colors.success,
  half: colors.halfDay,
  swap: colors.swapLeave,
  paid: colors.paidLeave,
  sick: "#EC4899",
  casual: "#14B8A6",
  unpaid: colors.danger,
  absent: colors.danger,
  holiday: colors.holidayGray,
};

const LEGEND = [
  { label: "Present", key: "present" },
  { label: "Half Day", key: "half" },
  { label: "Swap Leave", key: "swap" },
  { label: "Paid Leave", key: "paid" },
  { label: "Sick", key: "sick" },
  { label: "Casual", key: "casual" },
  { label: "Unpaid Leave", key: "unpaid" },
  { label: "Holiday", key: "holiday" },
];

const pad2 = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`; // m is 0-based
const monthKeyOf = (y, m) => `${y}-${pad2(m + 1)}`;

function localDateKey(d) {
  return keyOf(d.getFullYear(), d.getMonth(), d.getDate());
}

// Pulls an array out of a response payload no matter which key the backend
// wrapped it in ({ data }, { dates }, { holidays }, { computedDates }).
function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = [payload.data, payload.dates, payload.holidays, payload.computedDates];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

// Normalises one month of the backend calendar payload. `days` comes back
// as an object keyed by day-of-month ({ 1: {...}, 2: {...} }), not an array.
function toStatusMap(rawDays) {
  const list = Array.isArray(rawDays) ? rawDays : Object.values(rawDays || {});
  const map = {};
  list.forEach((d) => {
    const key = String(d?.date || "").slice(0, 10);
    if (key && d.status) map[key] = d.status;
  });
  return map;
}

function pickCounts(p) {
  return {
    present: p.presentCount ?? 0,
    half: p.halfCount ?? 0,
    paid: p.paidCount ?? 0,
    sick: p.sickCount ?? 0,
    casual: p.casualCount ?? 0,
    unpaid: p.unpaidCount ?? 0,
    swap: p.swapCount ?? 0,
  };
}

// ── Session caches (module level, survive screen re-mounts) ──────────────
const calendarCache = new Map(); // "me|2026|9" / "me|2026|annual" -> parsed page
let holidaysPromise = null; // admin holidays (all years)
const saturdayCache = new Map(); // year -> Promise<dates[]>

// Pull-to-refresh calls this so the next load goes to the server.
export function clearAttendanceCache() {
  calendarCache.clear();
  holidaysPromise = null;
  saturdayCache.clear();
  clearSalaryCache();
}

function loadHolidays() {
  if (!holidaysPromise) {
    holidaysPromise = holidayService
      .getAll()
      .then((res) => unwrapArray(res.data))
      .catch(() => {
        holidaysPromise = null;
        return [];
      });
  }
  return holidaysPromise;
}

function loadSaturdays(year) {
  if (!saturdayCache.has(year)) {
    saturdayCache.set(
      year,
      saturdayHolidayService
        .getComputedDates(year)
        .then((res) => unwrapArray(res.data))
        .catch(() => {
          saturdayCache.delete(year);
          return [];
        }),
    );
  }
  return saturdayCache.get(year);
}

// Expands holiday records into a Set of local "YYYY-MM-DD" keys, using the
// same date reading as utils/dateUtils.findHolidayForDate — one O(1) lookup
// per day instead of scanning every holiday for every cell.
function buildHolidaySet(list) {
  const set = new Set();
  list.forEach((h) => {
    if (!h || h.enabled === false) return;
    const start = new Date(h.date && !h.startDate ? h.date : h.startDate || h.date);
    if (isNaN(start.getTime())) return;
    start.setHours(0, 0, 0, 0);
    const end = new Date(h.date && !h.startDate ? h.date : h.endDate || h.startDate || h.date);
    end.setHours(0, 0, 0, 0);
    const cur = new Date(start);
    for (let i = 0; i < 400 && cur <= end; i++) {
      set.add(localDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (isNaN(end.getTime())) set.add(localDateKey(start));
  });
  return set;
}

// No staffId -> the logged-in user's own calendar (works for every role).
// staffId -> an admin viewing a specific staff member.
// NOTE: the backend's `month` query is 0-based (Jan = 0).
async function fetchCalendar(staffId, params) {
  const res = staffId
    ? await attendanceService.getStaffCalendar(staffId, params)
    : await attendanceService.getMyCalendar(params);
  const payload = res.data?.data;
  if (!payload) {
    const err = new Error(
      res.data?.message || "No staff profile is linked to your account yet — contact an admin."
    );
    err.noProfile = true;
    throw err;
  }
  return payload;
}

async function fetchPage(staffId, year, month /* number | "annual" */) {
  if (month === "annual") {
    const p = await fetchCalendar(staffId, { year, mode: "annual" });
    const maps = {};
    (p.months || []).forEach((m) => {
      maps[m.month] = toStatusMap(m.days);
    });
    return { maps, counts: pickCounts(p), paidLeaveValue: p.paidLeaveValue || {} };
  }
  const p = await fetchCalendar(staffId, { year, month });
  // `paidLeaveValue` is keyed by month (0-11) — same field the website reads.
  return { maps: { [month]: toStatusMap(p.days) }, counts: pickCounts(p), paidLeaveValue: p.paidLeaveValue || {} };
}

// ── One month grid ───────────────────────────────────────────────────────
const MonthGrid = memo(function MonthGrid({
  year,
  month,
  statusMap,
  holidaySet,
  todayKey,
  compact,
  minKey,
  maxKey,
  showSalary,
  salary,
  paidLeave,
  isLastMonth,
}) {
  // Only the weeks inside the working period are drawn: days after the
  // last working (relieving) date are left out completely, and whole weeks
  // before the joining date are skipped — so a month that ends on the 10th
  // has no empty rows (no big gap) under it.
  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    let lastDay = count;
    let firstDay = 1;
    for (let d = 1; d <= count; d++) {
      const k = keyOf(year, month, d);
      if (maxKey && k > maxKey) {
        lastDay = d - 1;
        break;
      }
    }
    for (let d = 1; d <= lastDay; d++) {
      if (minKey && keyOf(year, month, d) < minKey) firstDay = d + 1;
      else break;
    }
    const out = [];
    for (let i = 0; i < first; i++) out.push(null);
    for (let d = 1; d <= lastDay; d++) out.push(d);
    // Drop leading weeks that are entirely before the joining date.
    const skipWeeks = Math.floor((first + firstDay - 1) / 7);
    return out.slice(skipWeeks * 7).map((day, i) => ({ day, col: i % 7 }));
  }, [year, month, minKey, maxKey]);

  const weekLabels = compact ? SHORT_DAYS.map((d) => d[0]) : SHORT_DAYS;

  // Exact pixel size for every date. A wrapping grid with `aspectRatio`
  // cells is measured as if each cell were square, which left a big empty
  // gap under the last row — so the grid width is measured once and every
  // cell gets a fixed width / height instead.
  const [gridWidth, setGridWidth] = useState(0);
  const onGridLayout = useCallback((e) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    setGridWidth((prev) => (prev === w ? prev : w));
  }, []);
  const gap = compact ? 2 : 4;
  const cellW = gridWidth ? Math.floor((gridWidth - gap * 6) / 7) : 0;
  const cellH = Math.round(cellW / 1.25);
  const cellStyle = cellW
    ? [compact ? styles.miniCell : styles.cell, { width: cellW, height: cellH, margin: 0, aspectRatio: undefined }]
    : compact
      ? styles.miniCell
      : styles.cell;
  const textStyle = compact ? styles.miniCellText : styles.cellText;

  // PL shown only when this month actually earned it. In the last working
  // month (nothing earned) it reads "Last month" instead of "PL: —".
  const plText = paidLeave?.credited ? shortMoney(paidLeave.amount) : null;

  return (
    <View style={compact ? styles.miniWrap : undefined}>
      {compact ? (
        <View style={styles.miniHeader}>
          <Text style={styles.miniTitle}>{SHORT_MONTHS[month]}</Text>
          {showSalary ? (
            <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
              <Text style={styles.miniSalaryText} numberOfLines={1}>
                Sal: <Text style={styles.miniSalaryValue}>{salary ? shortMoney(salary.netSalary) : "—"}</Text>
              </Text>
              {plText ? (
                <Text style={styles.miniSalaryText} numberOfLines={1}>
                  PL: <Text style={styles.miniSalaryValue}>{plText}</Text>
                </Text>
              ) : isLastMonth ? (
                <Text style={[styles.miniSalaryText, { color: colors.warning }]} numberOfLines={1}>
                  Last month
                </Text>
              ) : null}
            </View>
          ) : isLastMonth ? (
            <Text style={[styles.miniSalaryText, { color: colors.warning }]}>Last month</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.weekRow}>
        {weekLabels.map((d, i) => (
          <Text key={i} style={[compact ? styles.miniWeekDay : styles.weekDay, i === 0 && { color: colors.danger }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={[styles.grid, cellW ? { gap } : null]} onLayout={onGridLayout}>
        {cells.map(({ day, col }, idx) => {
          if (!day) return <View key={idx} style={cellStyle} />;
          const key = keyOf(year, month, day);
          // Outside the working period (before joining / after the last
          // working day): leave the cell empty — no date, no colour.
          if ((minKey && key < minKey) || (maxKey && key > maxKey)) {
            return <View key={idx} style={cellStyle} />;
          }
          // Backend status wins; otherwise Sundays and holidays show grey.
          const backendStatus = statusMap?.[key];
          const isHolidayDay = col === 0 || holidaySet.has(key);
          const status = backendStatus || (isHolidayDay ? "holiday" : null);
          const bg = status ? STATUS_COLORS[status] || colors.paidLeave : null;
          return (
            <View
              key={idx}
              style={[cellStyle, styles.dateCell, bg && { backgroundColor: bg }, key === todayKey && styles.todayCell]}
            >
              <Text style={[textStyle, bg && styles.cellTextOnColor]}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default function AttendanceCalendar({ staffId, staff, staffName }) {
  const today = new Date();
  const todayKey = localDateKey(today);

  // Salary / Paid Leave / Advance figures and the working-period limits come
  // from the Staff record: your own (no staffId), or — for an admin viewing
  // someone — the `staff` record passed in.
  const { myProfile, hasLeft: myHasLeft } = useAuth();
  const own = !staffId;
  const profile = own ? myProfile : staff || null;
  const employeeId = own ? myProfile?._id || null : staffId;
  const joinKey = dateKeyFrom(profile?.date);
  const relieveKey = profile?.status === "Relieved" ? dateKeyFrom(profile?.relievingDate) : null;
  const hasLeft = own ? myHasLeft : hasLeftOrganization(staff);

  // Navigation bounds (joining month → last working month).
  const minYear = joinKey ? Number(joinKey.slice(0, 4)) : null;
  const minMonth = joinKey ? Number(joinKey.slice(5, 7)) - 1 : null;
  const maxYear = relieveKey ? Number(relieveKey.slice(0, 4)) : null;
  const maxMonth = relieveKey ? Number(relieveKey.slice(5, 7)) - 1 : null;
  const monthAllowed = useCallback(
    (y, m) => {
      if (minYear != null && (y < minYear || (y === minYear && m < minMonth))) return false;
      if (maxYear != null && (y > maxYear || (y === maxYear && m > maxMonth))) return false;
      return true;
    },
    [minYear, minMonth, maxYear, maxMonth],
  );

  const [viewMode, setViewMode] = useState("month"); // "month" | "year"
  const [rawMonthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rawYearCursor, setYearCursor] = useState(today.getFullYear());

  // Kept inside the working period: if the screen opens on a month after
  // the last working day (or before joining), the nearest allowed month /
  // year is shown instead.
  const monthCursor = useMemo(() => {
    const y = rawMonthCursor.getFullYear();
    const m = rawMonthCursor.getMonth();
    if (minYear != null && (y < minYear || (y === minYear && m < minMonth))) return new Date(minYear, minMonth, 1);
    if (maxYear != null && (y > maxYear || (y === maxYear && m > maxMonth))) return new Date(maxYear, maxMonth, 1);
    return rawMonthCursor;
  }, [rawMonthCursor, minYear, minMonth, maxYear, maxMonth]);
  let yearCursor = rawYearCursor;
  if (maxYear != null && yearCursor > maxYear) yearCursor = maxYear;
  if (minYear != null && yearCursor < minYear) yearCursor = minYear;

  const year = viewMode === "month" ? monthCursor.getFullYear() : yearCursor;
  const pageMonth = viewMode === "month" ? monthCursor.getMonth() : "annual";
  const pageKey = `${staffId || "me"}|${year}|${pageMonth}`;

  // The page on screen is read straight from the cache, so a month you
  // already opened shows instantly; `tick` re-renders when a fetch lands.
  const [, setTick] = useState(0);
  const [errors, setErrors] = useState({}); // pageKey -> message
  const page = calendarCache.get(pageKey) || null;
  const loading = !page && !errors[pageKey];
  const error = page ? "" : errors[pageKey] || "";

  // Fetch (or refresh in the background) the page on screen.
  useEffect(() => {
    let cancelled = false;
    fetchPage(staffId, year, pageMonth)
      .then((p) => {
        calendarCache.set(pageKey, p);
        if (!cancelled) setTick((t) => t + 1);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e.response?.data?.message || e.message || "Could not load calendar.";
          setErrors((prev) => ({ ...prev, [pageKey]: msg }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey, staffId, year, pageMonth]);

  // Holidays + Saturday holidays for the year on screen (cached).
  const [holidaySet, setHolidaySet] = useState(() => new Set());
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHolidays(), loadSaturdays(year)]).then(([named, sats]) => {
      if (!cancelled) setHolidaySet(buildHolidaySet([...named, ...sats]));
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  // ── Salary / Paid Leave / Advances (read-only, own calendar only) ──────
  const { salaryByMonth, salaryLoading, loadSalary, advancesByMonth, advancesLoading } = useMySalary(
    employeeId,
    year,
    joinKey,
    relieveKey,
  );
  // Whole year in Annual view (shown by default), just this month in Month view.
  useEffect(() => {
    if (!employeeId) return;
    if (viewMode === "month") loadSalary(monthCursor.getMonth());
    else loadSalary();
  }, [employeeId, viewMode, monthCursor, loadSalary]);

  // Full & Final Paid Leave — added to Total payable ONLY in the relieving
  // month of a staff member who has left (same as the website).
  const [fplState, setFinalPaidLeave] = useState(null);
  const finalPaidLeave = hasLeft && employeeId ? fplState : null;
  useEffect(() => {
    if (!hasLeft || !employeeId) return undefined;
    let cancelled = false;
    staffService
      .getSettlement(employeeId)
      .then((res) => {
        const fs = res.data?.data?.finalSettlement;
        if (cancelled || !fs) return;
        setFinalPaidLeave({
          days: Number(fs.leaveEncashmentDays) || 0,
          amount: Number(fs.leaveEncashment) || 0,
          months: fs.leaveEncashmentMonths || [],
        });
      })
      .catch(() => {
        if (!cancelled) setFinalPaidLeave(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasLeft, employeeId]);

  const lastMonthKey = relieveKey ? relieveKey.slice(0, 7) : null;
  const curMonthKey = monthKeyOf(monthCursor.getFullYear(), monthCursor.getMonth());
  const isRelievingMonth = hasLeft && lastMonthKey === curMonthKey;

  // ── Navigation (bounded by the working period) ─────────────────────────
  const prevMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
  const nextMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
  const canPrev =
    viewMode === "month"
      ? monthAllowed(prevMonth.getFullYear(), prevMonth.getMonth())
      : minYear == null || yearCursor - 1 >= minYear;
  const canNext =
    viewMode === "month"
      ? monthAllowed(nextMonth.getFullYear(), nextMonth.getMonth())
      : maxYear == null || yearCursor + 1 <= maxYear;

  const goPrev = () => {
    if (!canPrev) return;
    if (viewMode === "month") setMonthCursor(prevMonth);
    else setYearCursor(yearCursor - 1);
  };
  const goNext = () => {
    if (!canNext) return;
    if (viewMode === "month") setMonthCursor(nextMonth);
    else setYearCursor(yearCursor + 1);
  };

  const visibleMonths = useMemo(
    () => Array.from({ length: 12 }, (_, m) => m).filter((m) => monthAllowed(yearCursor, m)),
    [yearCursor, monthAllowed],
  );

  const counts = page?.counts || null;
  const plByMonth = page?.paidLeaveValue || {};

  return (
    <View>
      <View style={styles.controlsRow}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Toggle label="Month" active={viewMode === "month"} onPress={() => setViewMode("month")} />
          <Toggle label="Annual" active={viewMode === "year"} onPress={() => setViewMode("year")} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity onPress={goPrev} disabled={!canPrev} hitSlop={8} style={[styles.navBtn, !canPrev && styles.navDisabled]}>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.monthLabel} numberOfLines={1}>
            {viewMode === "month"
              ? `${SHORT_MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`
              : `${yearCursor}`}
          </Text>
          <TouchableOpacity onPress={goNext} disabled={!canNext} hitSlop={8} style={[styles.navBtn, !canNext && styles.navDisabled]}>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.wrap}>
        {staffName ? <Text style={styles.headerTitle}>{staffName}</Text> : null}
        {loading && !page ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {viewMode === "month" ? (
          <MonthGrid
            year={monthCursor.getFullYear()}
            month={monthCursor.getMonth()}
            statusMap={page?.maps?.[monthCursor.getMonth()]}
            holidaySet={holidaySet}
            todayKey={todayKey}
            compact={false}
            minKey={joinKey}
            maxKey={relieveKey}
          />
        ) : (
          <View style={styles.yearGrid}>
            {visibleMonths.map((m) => (
              <MonthGrid
                key={m}
                year={yearCursor}
                month={m}
                statusMap={page?.maps?.[m]}
                holidaySet={holidaySet}
                todayKey={todayKey}
                compact
                minKey={joinKey}
                maxKey={relieveKey}
                showSalary={!!employeeId}
                salary={salaryByMonth[m] || null}
                paidLeave={plByMonth[m] || null}
                isLastMonth={!!lastMonthKey && lastMonthKey === monthKeyOf(yearCursor, m)}
              />
            ))}
          </View>
        )}

        {viewMode === "year" && employeeId && salaryLoading ? (
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Updating salary…</Text>
        ) : null}

        {viewMode === "month" ? (
          employeeId ? (
            // Month view: legend on the LEFT, this month's summary on the RIGHT.
            <View style={styles.monthFooter}>
              <View style={styles.legendCol}>
                <Legend vertical />
              </View>
              <View style={{ flex: 1 }}>
                <MonthSummary
                  compact
                  monthLabel={`${SHORT_MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`}
                  pl={plByMonth[monthCursor.getMonth()] || null}
                  salary={salaryByMonth[monthCursor.getMonth()] || null}
                  salaryLoading={salaryLoading}
                  advances={advancesByMonth[`${monthCursor.getFullYear()}-${monthCursor.getMonth()}`] || []}
                  advancesLoading={advancesLoading}
                  isRelievingMonth={isRelievingMonth}
                  finalPaidLeave={finalPaidLeave}
                />
              </View>
            </View>
          ) : (
            <Legend />
          )
        ) : (
          <>
            {counts ? (
              <View style={styles.countsRow}>
                {[
                  ["Present", counts.present, colors.success],
                  ["Half", counts.half, colors.halfDay],
                  ["Paid", counts.paid, colors.paidLeave],
                  ["Sick+Casual", counts.sick + counts.casual, "#EC4899"],
                  ["Unpaid", counts.unpaid, colors.danger],
                ].map(([label, value, color]) => (
                  <View key={label} style={styles.countBox}>
                    <Text style={[styles.countValue, { color }]}>{value}</Text>
                    <Text style={styles.countLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Legend />
          </>
        )}
      </View>
    </View>
  );
}

// Colour key. `vertical` = one item per line (Month view, left column).
function Legend({ vertical }) {
  return (
    <View style={vertical ? styles.legendColList : styles.legendRow}>
      {LEGEND.map((item) => (
        <View key={item.key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[item.key] }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <View style={styles.legendTodayDot} />
        <Text style={styles.legendLabel}>Today</Text>
      </View>
    </View>
  );
}

function Toggle({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>{label}</Text>
    </TouchableOpacity>
  );
}

const CELL_SIZE = "13.6%";

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    ...shadow.soft,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 10 },
  navBtn: { padding: 2 },
  navDisabled: { opacity: 0.25 },
  monthLabel: { fontSize: 13, fontWeight: "700", color: colors.text, minWidth: 74, textAlign: "center" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    paddingVertical: 6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  // Every date is the same plain rectangle (slightly wider than tall).
  cell: {
    width: CELL_SIZE,
    aspectRatio: 1.25,
    margin: "0.3%",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCell: { backgroundColor: colors.track },
  todayCell: { borderWidth: 2, borderColor: colors.primary },
  cellText: { fontSize: 13, fontWeight: "500", color: colors.text },
  cellTextOnColor: { color: "#fff", fontWeight: "700" },
  error: { fontSize: 12, color: colors.danger, fontWeight: "500", marginBottom: 10 },
  countsRow: { flexDirection: "row", gap: 6, marginTop: 14 },
  countBox: { flex: 1, backgroundColor: colors.track, borderRadius: radius.sm, paddingVertical: 8, alignItems: "center" },
  countValue: { fontSize: 15, fontWeight: "800" },
  countLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 14 },
  legendColList: { gap: 7 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 14, height: 11, borderRadius: 2 },
  legendTodayDot: { width: 14, height: 11, borderRadius: 2, borderWidth: 1.5, borderColor: colors.primary },
  // Month view footer: legend (left) + month summary (right).
  monthFooter: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8 },
  legendCol: {
    width: 112,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.track,
    borderRadius: 10,
  },
  legendLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },

  // Year view
  yearGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  miniWrap: { width: "48%", marginBottom: 10 },
  // "Jan" on the left, Sal / PL on the right.
  miniHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
    minHeight: 30,
  },
  miniTitle: { fontSize: 12, fontWeight: "800", color: colors.text },
  miniWeekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "600",
    color: colors.textMuted,
  },
  miniCell: {
    width: CELL_SIZE,
    aspectRatio: 1.25,
    margin: "0.3%",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCellText: { fontSize: 8, color: colors.text },
  miniSalaryText: { fontSize: 9, color: colors.textMuted, fontWeight: "600" },
  miniSalaryValue: { fontSize: 9, color: colors.text, fontWeight: "800" },
});