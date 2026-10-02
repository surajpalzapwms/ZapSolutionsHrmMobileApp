// src/components/Settlement.jsx
// Full & Final Settlement for a staff member who has LEFT the organization.
//
//   <SettlementCard />      — Home card that replaces "Today's attendance":
//                             balance payable + Preview + Download PDF.
//   <SettlementStatement /> — the full statement (opened from Preview /
//                             the "Settlement" quick action).
//
// Data comes from GET /api/staff/:id/settlement — the same endpoint and
// figures as the website's Settlement Statement.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { staffService } from "../services/staffService";
import { colors, radius, shadow } from "../theme/colors";
import { d2, downloadSettlementPdf, fmtDate, money } from "../utils/settlementPdf";

export function useSettlement(staffId) {
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
      const res = await staffService.getSettlement(staffId);
      setData(res.data?.data || null);
      if (!res.data?.data) setError("Settlement statement is not ready yet — contact HR.");
    } catch (e) {
      setData(null);
      setError(e.response?.data?.message || "Couldn't load the settlement statement.");
    } finally {
      setLoading(false);
    }
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
  const { data, loading, error } = useSettlement(staff?._id);
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
          <Line label="Pending salary" value={money((fs.totalAmountPayable || 0) - (fs.leaveEncashment || 0))} />
          <Line label={`Paid Leave encashment (${d2(fs.leaveEncashmentDays)} days)`} value={money(fs.leaveEncashment)} />
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

export function SettlementStatement() {
  const { myProfile } = useAuth();
  const { data, loading, error, reload } = useSettlement(myProfile?._id);
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
        <Row label="Date of Confirmation" value={fmtDate(s.confirmationDate)} />
        <Row label="Relieving Date" value={fmtDate(s.relievingDate)} />
        <Row label="Monthly Salary" value={money(data.monthlySalary)} />
        <Row label="Per Day Salary" value={money(data.perDaySalary)} />
      </Section>

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

      <Section title={`Month-wise Salary (${period.fromLabel || ""} – ${period.toLabel || ""})`}>
        {(data.months || []).map((m) => (
          <Row
            key={m.period}
            label={m.label}
            sub={`${d2(m.payableDays - m.unpaidDays)}/${m.totalDays} days · Earned ${money(m.earned)} · Paid ${money(m.paid)}`}
            value={m.pending > 0 ? `Pending ${money(m.pending)}` : "Settled"}
            valueColor={m.pending > 0 ? "#B45309" : colors.success}
            highlight={m.pending > 0}
          />
        ))}
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
        {(fs.leaveEncashmentMonths || []).map((m) => (
          <Row
            key={`pl-${m.period}`}
            label={`Paid Leave ${m.label}`}
            sub={`${d2(m.days)} days × ${money(m.perDaySalary)}`}
            value={money(m.amount)}
            valueColor={colors.success}
          />
        ))}
        <Row label={`Leave encashment (${d2(fs.leaveEncashmentDays)} days)`} value={money(fs.leaveEncashment)} bold />
        <Row label="Total Amount Payable" value={money(fs.totalAmountPayable)} bold />
        {fs.outstandingAdvance > 0 ? (
          <Row label="Less: Outstanding Advance" value={`− ${money(fs.outstandingAdvance)}`} valueColor={colors.danger} />
        ) : null}
        <Row label="Balance Payable — Full & Final" value={money(fs.balancePayable)} highlight />
      </Section>

      <Btn label="Download PDF" onPress={download} loading={downloading} />

      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 12 }}>
        Figures are calculated live from attendance, leave and payroll records as of today. The PDF also includes the
        month-wise leave ledger.
      </Text>
    </ScrollView>
  );
}
