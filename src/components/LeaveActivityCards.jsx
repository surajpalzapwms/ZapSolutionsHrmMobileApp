// src/components/LeaveActivityCards.jsx — the leave cards of the Activity tab, shared so the
// Leave module (Home → Leave) looks exactly the same:
//   • purple section title with a count and "View all ›"
//   • white rounded card, one block per request (a multi-day request = ONE block)
//   • name / leave type + status badge, then label : value rows
//   • "View N days" for multi-day requests, full-width Approve / Reject for admins
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Badge, toneForStatus } from "./ModuleUI";
import { attendanceService } from "../services/attendanceService";
import { colors, radius, shadow } from "../theme/colors";
import { formatShortDate } from "../utils/format";
import { utcOffsetMs, weekendDays } from "../utils/tenant";

export const LEAVE_LABEL = {
  paid: "Paid Leave",
  unpaid: "Unpaid Leave",
  swapleave: "Swap Leave",
  sick: "Sick Leave",
  casual: "Casual Leave",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const idOf = (x) => x?._id || x?.id;
const userOf = (r) => (r?.userId && typeof r.userId === "object" ? r.userId : r?.staff || r?.staffId || {});
export const nameOf = (r, fallback = "Staff member") => {
  const u = typeof userOf(r) === "object" ? userOf(r) : {};
  return u.staffName || u.name || r?.staffName || r?.name || fallback;
};
export const roleOf = (r) => {
  const u = typeof userOf(r) === "object" ? userOf(r) : {};
  return u.designation || r?.designation || u.department || "";
};
export const staffCodeOf = (r) => {
  const u = typeof userOf(r) === "object" ? userOf(r) : {};
  return u.staffId || u.employeeId || r?.employeeId || "";
};
const leaveDateOf = (l) => l?.leaveDate || l?.date || l?.fromDate || l?.createdAt || "";
const typeKey = (l) => String(l?.leaveType || l?.type || "").toLowerCase();
export const leaveLabel = (t) => LEAVE_LABEL[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : "Leave");

// ---------------------------------------------------------------------------
// Grouping: ONE card per continuous leave.
// The server stores one row per day. Rows are joined into one card when they
//   • came from the same request (same batchId), or
//   • belong to the same person, have the same status and follow each other
//     day after day — weekly off days (Sunday, or Friday + Saturday …) in
//     between do not break the run.
// So 10–14 Nov is one card, also when the days were entered one by one by an
// admin or added automatically (absent / sandwich days).
// ---------------------------------------------------------------------------
const DAY_MS = 86400000;
// Calendar day "YYYY-MM-DD" of a leave row in the company's time zone (rows
// saved at local midnight, e.g. 18:30 UTC the day before in India, still
// give the right day).
const dayKeyOf = (l) => {
  const raw = leaveDateOf(l);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return String(raw);
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? new Date(t + utcOffsetMs()).toISOString().slice(0, 10) : "";
};
const dayNum = (key) => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const userKeyOf = (l) => String(idOf(l?.userId) || l?.userId || l?.staffId || "");
const statusOf = (l) => String(l?.status || "pending").toLowerCase();

// true when day `b` comes right after day `a`, with only weekly off days between.
const continues = (a, b) => {
  if (!a || !b) return false;
  const gap = dayNum(b) - dayNum(a);
  if (gap === 0 || gap === 1) return true;
  if (gap < 0 || gap > 8) return false;
  const off = weekendDays() || [0];
  for (let n = dayNum(a) + 1; n < dayNum(b); n++) {
    if (!off.includes(new Date(n * DAY_MS).getUTCDay())) return false;
  }
  return true;
};

export function groupLeaveRequests(raw = []) {
  const rows = raw
    .filter(Boolean)
    .map((l) => ({ l, key: dayKeyOf(l), user: userKeyOf(l), status: statusOf(l), batch: l.batchId || l.groupId || l.requestId || null }))
    .sort((x, y) => (x.user === y.user ? (x.key < y.key ? -1 : x.key > y.key ? 1 : 0) : x.user < y.user ? -1 : 1));

  const runs = [];
  let cur = null;
  for (const r of rows) {
    const sameBatch = cur && r.batch && cur.batches.has(r.batch);
    const joins =
      cur &&
      r.user === cur.user &&
      (sameBatch || (r.status === cur.status && continues(cur.lastKey, r.key)));
    if (joins) {
      cur.days.push(r.l);
      if (r.batch) cur.batches.add(r.batch);
      if (r.key > cur.lastKey) cur.lastKey = r.key;
    } else {
      cur = { user: r.user, status: r.status, lastKey: r.key, days: [r.l], batches: new Set(r.batch ? [r.batch] : []) };
      runs.push(cur);
    }
  }

  return runs
    .map((run) => {
      const sorted = run.days;
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const halfDays = sorted.filter((d) => d.isHalfDay || Number(d.dayValue) === 0.5).length;
      const unpaidDays = sorted.filter((d) => typeKey(d).includes("unpaid")).length;
      const created = sorted.map((d) => d.createdAt).filter(Boolean).sort().pop();
      // Pending while any day is still pending.
      const statuses = sorted.map(statusOf);
      const status = statuses.includes("pending") ? "pending" : statuses[0];
      const types = [...new Set(sorted.map(typeKey))];
      const reasons = [...new Set(sorted.map((d) => (d.reason || "").trim()).filter(Boolean))];
      const remarks = [...new Set(sorted.map((d) => (d.remarks || d.adminRemarks || "").trim()).filter(Boolean))];
      return {
        key: sorted.map(idOf).filter(Boolean).join("|") || `${run.user}-${dayKeyOf(first)}`,
        ids: sorted.map(idOf).filter(Boolean),
        days: sorted,
        first,
        staffName: nameOf(first),
        role: roleOf(first),
        staffCode: staffCodeOf(first),
        type: types.length === 1 ? types[0] : typeKey(first),
        types,
        status,
        reason: reasons.join(" · "),
        remarks: remarks.join(" · "),
        from: dayKeyOf(first),
        to: dayKeyOf(last),
        totalDays: sorted.length - halfDays * 0.5,
        unpaidDays,
        paidDays: sorted.length - unpaidDays,
        appliedOn: created,
        auto: sorted.some((d) => d.isAutoGenerated),
      };
    })
    // Latest leave first
    .sort((a, b) => (a.from < b.from ? 1 : a.from > b.from ? -1 : 0));
}

const sameDay = (a, b) => String(a).slice(0, 10) === String(b).slice(0, 10);
export const daysText = (n) => `${n} day${n === 1 ? "" : "s"}`;
export const dateRange = (g) =>
  sameDay(g.from, g.to) ? formatShortDate(g.from) : `${formatShortDate(g.from)} – ${formatShortDate(g.to)}`;
export const typeLine = (g) => {
  if (g.types && g.types.length > 1) {
    const count = {};
    g.days.forEach((d) => {
      const t = typeKey(d);
      count[t] = (count[t] || 0) + (d.isHalfDay || Number(d.dayValue) === 0.5 ? 0.5 : 1);
    });
    return Object.entries(count)
      .map(([t, n]) => `${n} ${leaveLabel(t).replace(/ Leave$/, "")}`)
      .join(" + ");
  }
  return leaveLabel(g.type);
};

// Confirm, then approve / reject every day of the request. Calls onDone() afterwards.
export function confirmLeaveDecision(g, approve, { setBusyKey, onDone }) {
  const word = approve ? "Approve" : "Reject";
  Alert.alert(`${word} leave?`, `${g.staffName}\n${dateRange(g)} · ${daysText(g.totalDays)}\n(${typeLine(g)})`, [
    { text: "Cancel", style: "cancel" },
    {
      text: word,
      style: approve ? "default" : "destructive",
      onPress: async () => {
        setBusyKey?.(g.key);
        // Only the days still pending need a decision.
        const days = g.days.filter((d) => String(d.status || "pending").toLowerCase() === "pending");
        const ids = (days.length ? days : g.days).map(idOf).filter(Boolean);
        const results = await Promise.allSettled(
          ids.map((id) =>
            approve ? attendanceService.approveLeaveRequest(id) : attendanceService.rejectLeaveRequest(id, "")
          )
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length) {
          const msg = failed[0].reason?.response?.data?.message;
          Alert.alert("Leave request", msg || `${failed.length} of ${ids.length} days were not updated. Please try again.`);
        }
        await onDone?.();
        setBusyKey?.(null);
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
export function SectionHeader({ title, count, canToggle, open, onToggle, right }) {
  return (
    <View style={activityStyles.sectionRow}>
      <Text style={activityStyles.section}>
        {title}
        {count ? ` (${count})` : ""}
      </Text>
      {right ||
        (canToggle ? (
          <TouchableOpacity onPress={onToggle} hitSlop={8}>
            <Text style={activityStyles.link}>{open ? "Show less" : "View all ›"}</Text>
          </TouchableOpacity>
        ) : null)}
    </View>
  );
}

export function DetailRow({ label, value, valueColor }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={activityStyles.detailRow}>
      <Text style={activityStyles.detailLabel}>{label}</Text>
      <Text style={[activityStyles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// Pill filters (Pending / Approved / ...) in the Activity colours.
export function FilterChips({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
      {options.map(([key, label]) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : colors.card,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function LeaveDetail({ g, divider, showName, busy, canDecide, onApprove, onReject }) {
  const [openDays, setOpenDays] = useState(false);
  return (
    <View style={[activityStyles.item, divider && activityStyles.divider]}>
      <View style={activityStyles.rowTop}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={activityStyles.name}>{showName ? g.staffName : leaveLabel(g.type)}</Text>
          {showName && (g.staffCode || g.role) ? (
            <Text style={activityStyles.muted}>{[g.staffCode, g.role].filter(Boolean).join(" · ")}</Text>
          ) : null}
        </View>
        <Badge label={g.status} tone={toneForStatus(g.status)} />
      </View>

      <View style={{ marginTop: 10 }}>
        <DetailRow label="Leave type" value={typeLine(g)} />
        <DetailRow label="Dates" value={dateRange(g)} />
        <DetailRow label="Total" value={daysText(g.totalDays)} />
        {g.days.some((d) => d.isHalfDay || Number(d.dayValue) === 0.5) ? <DetailRow label="Half day" value="Yes" /> : null}
        <DetailRow label="Applied on" value={g.appliedOn ? formatShortDate(g.appliedOn) : null} />
        <DetailRow label="Marked" value={g.auto ? "Automatically (absent)" : null} />
        <DetailRow label="Reason" value={g.reason} />
        <DetailRow label="Remarks" value={g.remarks} />
      </View>

      {g.days.length > 1 ? (
        <TouchableOpacity onPress={() => setOpenDays((v) => !v)} hitSlop={6}>
          <Text style={[activityStyles.link, { marginTop: 8 }]}>
            {openDays ? "Hide days" : `View ${g.days.length} days`}
          </Text>
        </TouchableOpacity>
      ) : null}
      {openDays ? (
        <View style={activityStyles.dayList}>
          {g.days.map((d, i) => (
            <Text key={idOf(d) || i} style={activityStyles.dayText}>
              • {formatShortDate(dayKeyOf(d))} — {leaveLabel(typeKey(d))}
              {d.isHalfDay ? " (half day)" : ""}
              {g.status !== String(d.status || "").toLowerCase() && d.status ? ` · ${d.status}` : ""}
            </Text>
          ))}
        </View>
      ) : null}

      {canDecide ? (
        <View style={activityStyles.actions}>
          {busy ? (
            <ActivityIndicator color={colors.primary} style={{ flex: 1, height: 44 }} />
          ) : (
            <>
              <TouchableOpacity style={[activityStyles.btn, activityStyles.approve]} onPress={onApprove} activeOpacity={0.85}>
                <Text style={activityStyles.btnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[activityStyles.btn, activityStyles.reject]} onPress={onReject} activeOpacity={0.85}>
                <Text style={activityStyles.btnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

// A section of request cards: title (count, View all) + one white card.
export function LeaveRequestSection({
  title,
  groups,
  loading,
  error,
  emptyText,
  showCount = 3,
  showName,
  canDecide,
  busyKey,
  onDecide,
  headerRight,
  children,
}) {
  const [all, setAll] = useState(false);
  const visible = all ? groups : groups.slice(0, showCount);
  return (
    <>
      <SectionHeader
        title={title}
        count={groups.length}
        canToggle={groups.length > showCount}
        open={all}
        onToggle={() => setAll((v) => !v)}
        right={headerRight}
      />
      {children}
      <View style={activityStyles.card}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 18 }} />
        ) : error ? (
          <Text style={[activityStyles.empty, { color: colors.danger }]}>{error}</Text>
        ) : visible.length === 0 ? (
          <Text style={activityStyles.empty}>{emptyText}</Text>
        ) : (
          visible.map((g, i) => (
            <LeaveDetail
              key={g.key}
              g={g}
              divider={i > 0}
              showName={showName}
              busy={busyKey === g.key}
              canDecide={canDecide && g.status === "pending"}
              onApprove={() => onDecide?.(g, true)}
              onReject={() => onDecide?.(g, false)}
            />
          ))
        )}
      </View>
    </>
  );
}

export const activityStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen, paddingHorizontal: 16 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  section: { fontSize: 17, fontWeight: "700", color: colors.primary },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...shadow.card,
  },
  empty: { color: colors.textMuted, fontSize: 14, paddingVertical: 18 },
  item: { paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTop: { flexDirection: "row", alignItems: "flex-start" },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  timeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  timeBox: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  timeLabel: { fontSize: 11, color: colors.textMuted },
  timeValue: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  detailRow: { flexDirection: "row", paddingVertical: 4 },
  detailLabel: { width: 96, fontSize: 13, color: colors.textMuted },
  detailValue: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "500" },
  link: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  dayList: { marginTop: 6, paddingLeft: 4 },
  dayText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
