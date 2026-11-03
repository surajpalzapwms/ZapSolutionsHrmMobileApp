// src/components/Settlement.jsx
// Full & Final Settlement for a staff member who has LEFT the organization.
//
//   <SettlementCard />      — Home card that replaces "Today's attendance":
//                             balance payable + Preview + Download PDF.
//   <SettlementStatement /> — the full statement (opened from Preview /
//                             the "Settlement" quick action).
//
// Data comes from GET /api/staff/:id/settlement (leave, encashment,
// advance). The month-wise salary still owed comes from the SAME rules as the
// "Pending Amount" screen (services/pendingSalaryService.js), so every month
// worked — e.g. Sep 2026 and Oct 2026 — is listed, and the total payable
// here always equals the Pending Amount total (+ leave encashment − advance).
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { staffService } from "../services/staffService";
import { getPendingSalary } from "../services/pendingSalaryService";
import { colors, radius, shadow } from "../theme/colors";
import { d2, downloadSettlementPdf, fmtDate, money } from "../utils/settlementPdf";
import { monthBreakdownLines, monthTotals } from "../utils/settlementBreakdown";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const labelOf = (p) => {
  const [y, m] = String(p).split("-").map(Number);
  return `${MONTHS[m - 1] || m} ${y}`;
};

// Puts the Pending Amount months into the settlement and recomputes totals:
//   Pending salary      = Pending Amount total (every unpaid month)
//   Total payable       = Pending salary + Paid Leave encashment
//   Balance payable     = Total payable − outstanding advance
// (an advance already taken off a "not generated" month's estimate is not
// taken off a second time).
export function mergePendingIntoSettlement(data, pending) {
  if (!data || !pending) return data;
  const items = pending.items || [];
  const byPeriod = new Map(items.map((it) => [it.period, it]));
  const rows = new Map();

  (data.months || []).forEach((m) => {
    const it = byPeriod.get(m.period);
    const pend = it ? r2(it.pending) : 0;
    rows.set(m.period, {
      ...m,
      earned: it ? r2(Math.max(Number(m.earned) || 0, (Number(it.paid) || 0) + pend)) : m.earned,
      // Not in Pending Amount = fully paid.
      paid: it ? r2(it.paid) : r2(m.earned),
      pending: pend,
      payrollStatus: it ? (it.kind === "not_generated" ? "not generated" : it.kind) : m.payrollStatus,
    });
  });
  items.forEach((it) => {
    if (rows.has(it.period)) return;
    rows.set(it.period, {
      period: it.period,
      label: labelOf(it.period),
      payableDays: it.payableDays ?? it.record?.attendanceInfo?.payableDays ?? 0,
      unpaidDays: it.unpaidDays ?? it.record?.attendanceInfo?.unpaidLeaves ?? 0,
      totalDays: it.totalDays ?? it.record?.attendanceInfo?.totalWorkingDays ?? 0,
      earned: r2((Number(it.paid) || 0) + (Number(it.pending) || 0)),
      paid: r2(it.paid),
      pending: r2(it.pending),
      payrollStatus: it.kind === "not_generated" ? "not generated" : it.kind,
    });
  });

  const months = [...rows.values()].sort((a, b) => a.period.localeCompare(b.period));
  const fs = data.finalSettlement || {};
  const pendingSalary = r2(pending.total);
  const leaveEncashment = r2(fs.leaveEncashment);
  const advanceInEstimates = r2(
    items.filter((it) => it.kind === "not_generated").reduce((s, it) => s + (Number(it.advance) || 0), 0),
  );
  const outstandingAdvance = r2(Math.max(0, (Number(fs.outstandingAdvance) || 0) - advanceInEstimates));
  const totalAmountPayable = r2(pendingSalary + leaveEncashment);

  return {
    ...data,
    salaryPeriod: months.length
      ? {
          ...(data.salaryPeriod || {}),
          from: months[0].period,
          fromLabel: months[0].label,
        }
      : data.salaryPeriod,
    months,
    pendingMonths: months.filter((m) => m.pending > 0),
    finalSettlement: {
      ...fs,
      totalEarned: r2(months.reduce((s, m) => s + (Number(m.earned) || 0), 0)),
      amountAlreadyPaid: r2(months.reduce((s, m) => s + (Number(m.paid) || 0), 0)),
      pendingSalary,
      totalAmountPayable,
      outstandingAdvance,
      balancePayable: r2(Math.max(0, totalAmountPayable - outstandingAdvance)),
    },
  };
}

export function useSettlement(staff) {
  const staffId = staff?._id || null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!staffId);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!staffId) {
      setLoading(false);
      setError("No staff profile is linked to your account — contact HR.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [res, pending] = await Promise.all([
        staffService.getSettlement(staffId),
        getPendingSalary({
          employeeId: staffId,
          joiningDate: staff?.date || staff?.joiningDate || null,
          relievingDate: staff?.relievingDate || null,
          hasLeft: true,
        }).catch(() => null),
      ]);
      const base = res.data?.data || null;
      setData(base ? mergePendingIntoSettlement(base, pending) : null);
      if (!base) setError("Settlement statement is not ready yet — contact HR.");
    } catch (e) {
      setData(null);
      setError(e.response?.data?.message || "Couldn't load the settlement statement.");
    } finally {
      setLoading(false);
    }
    // staff fields used above only change with the id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

function useDownload(data) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      await downloadSettlementPdf(data);
    } catch {
      Alert.alert("Download failed", "Couldn't generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  return { downloading, download };
}

function Btn({ label, onPress, disabled, loading, variant = "primary" }) {
  const primary = variant === "primary";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? colors.primary : colors.primarySoft,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#fff" : colors.primary} />
      ) : (
        <Text style={{ fontSize: 13, fontWeight: "700", color: primary ? "#fff" : colors.primary }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Home card ────────────────────────────────────────────────────────────
export function SettlementCard({ staff, onPreview }) {
  const { data, loading, error } = useSettlement(staff);
  const { downloading, download } = useDownload(data);
  const fs = data?.finalSettlement;

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow.card }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Full &amp; Final Settlement</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
        Relieved on {fmtDate(staff?.relievingDate)}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} />
      ) : error ? (
        <Text style={{ fontSize: 12, color: colors.danger, marginTop: 12 }}>{error}</Text>
      ) : fs ? (
        <View style={{ marginTop: 12, backgroundColor: "#FDF0D1", borderRadius: radius.md, padding: 12 }}>
          {(data.pendingMonths || []).length ? (
            (data.pendingMonths || []).map((m) => (
              <Line key={m.period} label={`${m.label} salary`} value={money(m.pending)} />
            ))
          ) : (
            <Line label="Pending salary" value={money(0)} />
          )}
          {(data.pendingMonths || []).length > 1 ? (
            <Line label="Pending salary (total)" value={money(fs.pendingSalary)} />
          ) : null}
          {!data.probationExit ? (
            <Line label={`Paid Leave encashment (${d2(fs.leaveEncashmentDays)} days)`} value={money(fs.leaveEncashment)} />
          ) : null}
          {fs.outstandingAdvance > 0 ? (
            <Line label="Less: outstanding advance" value={`− ${money(fs.outstandingAdvance)}`} color={colors.danger} />
          ) : null}
          <View style={{ height: 1, backgroundColor: "#EBD7A6", marginVertical: 6 }} />
          <Line label="Balance payable" value={money(fs.balancePayable)} bold />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Btn label="Preview" variant="soft" onPress={onPreview} disabled={!data} />
        <Btn label="Download PDF" onPress={download} disabled={!data} loading={downloading} />
      </View>
    </View>
  );
}

function Line({ label, value, bold, color }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, gap: 10 }}>
      <Text style={{ flex: 1, fontSize: 12, color: bold ? "#78500A" : colors.textMuted, fontWeight: bold ? "800" : "500" }}>
        {label}
      </Text>
      <Text style={{ fontSize: bold ? 16 : 13, fontWeight: bold ? "800" : "700", color: color || (bold ? "#78500A" : colors.text) }}>
        {value}
      </Text>
    </View>
  );
}

// ── Full statement (sheet) ───────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      <View style={{ backgroundColor: "#1F4A82", paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, highlight, bold, sub, valueColor }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: highlight ? "#FDF0D1" : "#fff",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: highlight || bold ? colors.text : colors.textMuted, fontWeight: highlight || bold ? "700" : "500" }}>
          {label}
        </Text>
        {sub ? <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 12, fontWeight: highlight || bold ? "800" : "600", color: valueColor || colors.text }}>
        {value}
      </Text>
    </View>
  );
}

// "How this month's amount came" — opened with View details.
function MonthRow({ m }) {
  const [open, setOpen] = useState(false);
  const unpaid = Number(m.unpaidDays) || 0;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: m.pending > 0 ? "#FDF0D1" : "#fff" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, paddingHorizontal: 12, paddingTop: 9 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.text, fontWeight: "700" }}>{m.label}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
            {`${d2(m.payableDays - m.unpaidDays)}/${m.totalDays} days paid · Earned ${money(m.earned)} · Paid ${money(m.paid)}`}
          </Text>
          <Text style={{ fontSize: 10, color: unpaid ? colors.danger : colors.textMuted, marginTop: 1 }}>
            {unpaid ? `Unpaid leave: ${d2(unpaid)} day(s)` : "No unpaid leave"}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "800", color: m.pending > 0 ? "#B45309" : colors.success }}>
          {m.pending > 0 ? `Pending ${money(m.pending)}` : "Settled"}
        </Text>
      </View>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} hitSlop={6} style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{open ? "Hide details ▲" : "View details ▼"}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={{ marginHorizontal: 12, marginBottom: 10, padding: 10, borderRadius: radius.md, backgroundColor: "#EFF6FF" }}>
          {monthBreakdownLines(m).map((l, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
                paddingVertical: 3,
                borderTopWidth: l.kind === "total" ? 1 : 0,
                borderTopColor: "#BFDBFE",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: l.kind === "muted" ? colors.textMuted : colors.text,
                    fontWeight: l.kind === "total" ? "800" : "500",
                  }}
                >
                  {l.sign && l.sign !== "=" ? `${l.sign === "-" ? "−" : "+"} ` : ""}
                  {l.label}
                </Text>
                {l.sub ? <Text style={{ fontSize: 10, color: colors.textMuted }}>{l.sub}</Text> : null}
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: l.kind === "total" || l.kind === "pending" ? "800" : "600",
                  color: l.sign === "-" ? colors.danger : l.kind === "pending" ? "#B45309" : colors.text,
                }}
              >
                {l.sign === "-" ? "− " : ""}
                {money(l.amount)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// `staff` = the staff member to show (super admin, from Staff → details).
// Without it, the logged-in staff member's own settlement is shown.
export function SettlementStatement({ staff } = {}) {
  const { myProfile } = useAuth();
  const { data, loading, error, reload } = useSettlement(staff || myProfile);
  const { downloading, download } = useDownload(data);

  if (loading && !data) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  }
  if (error || !data) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: 13 }}>{error || "Settlement statement not available."}</Text>
      </View>
    );
  }

  const s = data.staff || {};
  const lb = data.leaveBalance || {};
  const t = lb.totals;
  const fs = data.finalSettlement || {};
  const period = data.salaryPeriod || {};
  // Left during probation: no salary rate rows, no Leave Summary/encashment.
  const probation = !!data.probationExit;
  const mt = monthTotals(data.months || []);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
        Salary {period.fromLabel} to {fmtDate(s.relievingDate)}
      </Text>

      <Section title="Overview">
        <Row label="Staff Name" value={s.staffName || "—"} />
        {s.staffId ? <Row label="Staff ID" value={s.staffId} /> : null}
        <Row
          label={probation ? "Joining Date (Probation)" : "Joining Date"}
          value={fmtDate(s.joiningDate || (staff || myProfile)?.date)}
        />
        <Row label="Date of Confirmation" value={probation ? "— (left during probation)" : fmtDate(s.confirmationDate)} />
        <Row label={probation ? "Termination / Relieving Date" : "Relieving Date"} value={fmtDate(s.relievingDate)} />
        {!probation ? <Row label="Monthly Salary" value={money(data.monthlySalary)} /> : null}
        {!probation ? <Row label="Per Day Salary" value={money(data.perDaySalary)} /> : null}
      </Section>

      {probation ? (
        <View style={{ backgroundColor: "#EFF6FF", borderRadius: radius.md, padding: 12, marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: "#1E40AF" }}>
            Left during the probation period — no leave is earned before confirmation, so there is no Leave Summary or
            leave encashment. Unpaid leave is deducted month by month below; tap View details to see how each month's
            amount was worked out.
          </Text>
        </View>
      ) : (
      <Section title="Leave Summary">
        {t ? (
          <>
            <Row
              label="Leave earned"
              sub={`Sick ${d2(t.earned.sick)} · Casual ${d2(t.earned.casual)} · Paid ${d2(t.earned.paid)}`}
              value={`${d2(t.earned.sick + t.earned.casual + t.earned.paid)} days`}
              bold
            />
            <Row
              label="Leave taken"
              sub={`Sick ${d2(t.taken.sick)} · Casual ${d2(t.taken.casual)} · Paid ${d2(t.taken.paid)}`}
              value={`${d2(t.taken.total)} days`}
              bold
            />
            <Row label="Deducted from Sick + Casual first" value={`− ${d2(t.deducted.sickCasual)} days`} />
            <Row label="Then deducted from Paid Leave" value={`− ${d2(t.deducted.paid)} days`} />
            <Row label="Sick + Casual unused (lapsed — not paid)" value={`${d2(t.sickCasualUnused)} days`} />
          </>
        ) : null}
        <Row label="Paid Leave Remaining (encashed)" value={`${d2(lb.paidRemaining)} days`} highlight />
      </Section>
      )}

      <Section title={`Month-wise Salary (${period.fromLabel || ""} – ${period.toLabel || ""})`}>
        {(data.months || []).map((m) => (
          <MonthRow key={m.period} m={m} />
        ))}
        <Row
          label="Total"
          sub={`Unpaid leave ${d2(mt.unpaidDays)} day(s) · Earned ${money(mt.earned)} · Paid ${money(mt.paid)}`}
          value={`Pending ${money(mt.pending)}`}
          bold
        />
      </Section>

      <Section title="Final Settlement Amount">
        {(data.pendingMonths || []).length === 0 ? <Row label="Pending Salary" value={money(0)} /> : null}
        {(data.pendingMonths || []).map((m) => (
          <Row
            key={m.period}
            label={
              m.beforeConfirmation
                ? `${m.label} salary (pending from before confirmation)`
                : `${m.label} salary (${d2(m.payableDays - m.unpaidDays)} of ${m.totalDays} days)`
            }
            value={money(m.pending)}
          />
        ))}
        {(probation ? [] : fs.leaveEncashmentMonths || []).map((m) => (
          <Row
            key={`pl-${m.period}`}
            label={`Paid Leave ${m.label}`}
            sub={`${d2(m.days)} days × ${money(m.perDaySalary)}`}
            value={money(m.amount)}
            valueColor={colors.success}
          />
        ))}
        {!probation ? (
          <Row label={`Leave encashment (${d2(fs.leaveEncashmentDays)} days)`} value={money(fs.leaveEncashment)} bold />
        ) : null}
        <Row label="Total Amount Payable" value={money(fs.totalAmountPayable)} bold />
        {fs.outstandingAdvance > 0 ? (
          <Row label="Less: Outstanding Advance" value={`− ${money(fs.outstandingAdvance)}`} valueColor={colors.danger} />
        ) : null}
        <Row label="Balance Payable — Full & Final" value={money(fs.balancePayable)} highlight />
      </Section>

      <Btn label="Download PDF" onPress={download} loading={downloading} />

      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 12 }}>
        Figures are calculated live from attendance, leave and payroll records as of today. The PDF also includes every
        month's details{probation ? "" : " and the month-wise leave ledger"}.
      </Text>
    </ScrollView>
  );
}
