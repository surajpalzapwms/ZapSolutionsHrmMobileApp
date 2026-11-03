// src/screens/SalarySlipScreen.jsx
// Same list layout as PayrollScreen (newest month first), but ONLY months
// whose salary is fully PAID are listed, each with a Download button that
// saves that month's salary slip as a PDF.
//
// Super admin: a staff dropdown on top (same picker as Attendance). Pick a
// staff member to see ONLY that person's salary slips, newest first — the
// most recently generated month is at the top, marked "Latest".
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { payrollService } from "../services/payrollService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { ListItem } from "../components/ModuleUI";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius } from "../theme/colors";
import { formatMoney, formatPeriod } from "../utils/format";
import { downloadPayslipPdf } from "../utils/payslipPdf";
import StaffPicker, { clearStaffCache, staffKeyOf, useAllStaff } from "../components/StaffPicker";

const staffNameOf = (item) =>
  item.staffName ||
  item.staff?.name ||
  (typeof item.employeeId === "object" && item.employeeId?.staffName) ||
  "Staff";

const periodOf = (p) => String(p.period || p.month || "");
const empIdOf = (p) => String(p.employeeId?._id || p.employeeId || "");

export default function SalarySlipScreen() {
  const { isSuperAdmin } = useAuth();
  if (isSuperAdmin) return <SalarySlipByStaff />;
  return <SalarySlipList />;
}

// ── Super admin: pick a staff member, then that person's slips ─────────────
function SalarySlipByStaff() {
  const { staff: allStaff, error: staffError, reload: reloadStaff } = useAllStaff(true);
  const [viewStaff, setViewStaff] = useState(null);

  // Start on the first staff member, like the Attendance tab.
  useEffect(() => {
    if (!viewStaff && allStaff.length) setViewStaff(allStaff[0]);
  }, [viewStaff, allStaff]);

  const staffId = staffKeyOf(viewStaff);

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <StaffPicker staff={allStaff} selected={viewStaff} onSelect={setViewStaff} />
        {staffError ? (
          <TouchableOpacity
            onPress={() => {
              clearStaffCache();
              reloadStaff(true);
            }}
          >
            <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{staffError} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {staffId ? (
        // Keyed by staff, so switching person starts a fresh list.
        <StaffSlips key={staffId} staffId={staffId} staff={viewStaff} />
      ) : (
        <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 24 }}>
          {staffError ? "" : "Loading staff…"}
        </Text>
      )}
    </View>
  );
}

function StaffSlips({ staffId, staff }) {
  const loader = useListLoader(
    () => payrollService.getAll({ employeeId: staffId, status: "paid" }),
    "Could not load salary slips.",
    `salary-slips:${staffId}`,
  );
  const [busyKey, setBusyKey] = useState(null);

  const items = useMemo(
    () =>
      loader.items
        // Only this staff member (in case the server ignores `employeeId`)
        // and only paid months; newest (last generated) month first.
        .filter((p) => !empIdOf(p) || empIdOf(p) === staffId)
        .filter((p) => String(p.status || "").toLowerCase() === "paid")
        .sort((a, b) => periodOf(b).localeCompare(periodOf(a))),
    [loader.items, staffId],
  );
  const sorted = { ...loader, items };
  const latestKey = items[0] ? items[0]._id || periodOf(items[0]) : null;

  const onDownload = useCallback(
    async (item) => {
      if (busyKey) return;
      setBusyKey(item._id || item.period);
      try {
        await downloadPayslipPdf(item, staff || { staffName: staffNameOf(item) });
      } catch {
        Alert.alert("Download failed", "Couldn't generate the salary slip PDF. Please try again.");
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, staff],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const key = item._id || item.period;
      return (
        <SlipRow
          item={item}
          latest={key === latestKey}
          busy={busyKey === key}
          onDownload={onDownload}
        />
      );
    },
    [busyKey, onDownload, latestKey],
  );

  return (
    <ModuleList
      loader={sorted}
      extraData={busyKey}
      emptyEmoji="📄"
      emptyMessage="No salary slips generated for this staff member yet."
      renderItem={renderItem}
    />
  );
}

// ── Staff / admin: unchanged list ─────────────────────────────────────────
function SalarySlipList() {
  const { isAdmin, myProfile } = useAuth();
  const loader = useListLoader(
    () =>
      payrollService.getAll(
        !isAdmin && myProfile?._id ? { employeeId: myProfile._id, status: "paid" } : { status: "paid" },
      ),
    "Could not load salary slips.",
  );
  const [busyKey, setBusyKey] = useState(null);

  const items = useMemo(
    () =>
      loader.items
        // Only paid months (also filtered here in case the server ignores `status`).
        .filter((p) => String(p.status || "").toLowerCase() === "paid")
        .sort((a, b) =>
        String(b.period || b.month || "").localeCompare(String(a.period || a.month || "")),
      ),
    [loader.items],
  );
  const sorted = { ...loader, items };

  const onDownload = useCallback(
    async (item) => {
      if (busyKey) return;
      setBusyKey(item._id || item.period);
      try {
        await downloadPayslipPdf(item, isAdmin ? { staffName: staffNameOf(item) } : myProfile);
      } catch {
        Alert.alert("Download failed", "Couldn't generate the salary slip PDF. Please try again.");
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, isAdmin, myProfile],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <SlipRow
        item={item}
        showName={isAdmin}
        busy={busyKey === (item._id || item.period)}
        onDownload={onDownload}
      />
    ),
    [isAdmin, busyKey, onDownload],
  );

  return (
    <ModuleList
      loader={sorted}
      emptyEmoji="📄"
      emptyMessage="No paid salary slips yet."
      renderItem={renderItem}
    />
  );
}

// "Leave ₹1,333.33 · Navkar 25% ₹5,000.00 · Deductions ₹500.00"
function slipMeta(item) {
  const parts = [];
  const leave = Number(item.attendanceInfo?.leaveDeduction ?? item.leaveDeduction) || 0;
  const late = Number(item.attendanceInfo?.lateDeduction ?? item.lateDeduction) || 0;
  const ref = Number(item.referralCommission) || 0;
  if (leave) parts.push(`Leave ${formatMoney(leave)}`);
  if (late) parts.push(`Late ${formatMoney(late)}`);
  if (ref) {
    const org = item.referral?.organizationName || item.referralOrganization || "Referral";
    const pct = Number(item.referral?.percent ?? item.referralPercent) || 0;
    parts.push(`${org}${pct ? ` ${pct}%` : ""} ${formatMoney(ref)}`);
  }
  if (Number(item.totalDeduction)) parts.push(`Deductions ${formatMoney(item.totalDeduction)}`);
  if (Number(item.advanceDeduction)) parts.push(`Advance ${formatMoney(item.advanceDeduction)}`);
  return parts.length ? parts.join(" · ") : undefined;
}

const SlipRow = memo(function SlipRow({ item, showName, latest, busy, onDownload }) {
  const net = item.netSalary ?? item.netPay ?? item.amount;
  return (
    <ListItem
      emoji="📄"
      emojiBg="#E0E7FF"
      title={formatPeriod(item.period || item.month)}
      subtitle={showName ? staffNameOf(item) : latest ? "✅ Paid · Latest" : "✅ Paid"}
      meta={slipMeta(item)}
      right={
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{formatMoney(net)}</Text>
          <TouchableOpacity
            onPress={() => onDownload(item)}
            disabled={busy}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
              minWidth: 92,
              alignItems: "center",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>⬇ Download</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    />
  );
});
