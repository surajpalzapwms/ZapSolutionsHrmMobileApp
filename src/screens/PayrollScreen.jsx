// src/screens/PayrollScreen.jsx
// Payroll list (newest month first). Tap any month to open its full
// details: attendance used for the month, basic salary, allowances,
// deductions (each line), advance recovered, leave deduction, net salary,
// and what has been paid / is still pending with the payment history.
import React, { memo, useCallback, useMemo, useState } from "react";
import { BackHandler, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { BackLink, StaffRow, TotalsHeader, idOf, useStaffMap } from "../components/StaffWise";
import { Loading, EmptyState } from "../components/ScreenStates";
import { payrollService } from "../services/payrollService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { Badge, Card, Divider, ListItem, toneForStatus } from "../components/ModuleUI";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius } from "../theme/colors";
import { formatMoney, formatPeriod, formatShortDate } from "../utils/format";

const money2 = (v) =>
  `₹${(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v) => Number(v) || 0;

const staffNameOf = (item) =>
  item.staffName ||
  item.staff?.name ||
  (typeof item.employeeId === "object" && item.employeeId?.staffName) ||
  "Staff";

export default function PayrollScreen() {
  const { isAdmin, isSuperAdmin } = useAuth();
  if (isSuperAdmin) return <PayrollByStaff />;
  return <PayrollMonths isAdmin={isAdmin} />;
}

function PayrollMonths({ isAdmin }) {
  const loader = useListLoader(() => payrollService.getAll(), "Could not load payroll.");
  const [selected, setSelected] = useState(null);

  // Newest month first.
  const items = useMemo(
    () =>
      [...loader.items].sort((a, b) =>
        String(b.period || b.month || "").localeCompare(String(a.period || a.month || ""))
      ),
    [loader.items]
  );
  const sorted = { ...loader, items };

  // Android back button closes the details first.
  React.useEffect(() => {
    if (!selected) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selected]);

  const renderItem = useCallback(
    ({ item }) => <PayrollRow item={item} showName={isAdmin} onPress={setSelected} />,
    [isAdmin]
  );

  if (selected) {
    return <PayrollDetails item={selected} showName={isAdmin} onBack={() => setSelected(null)} />;
  }

  return (
    <ModuleList
      loader={sorted}
      emptyEmoji="💰"
      emptyMessage="No payroll records found."
      renderItem={renderItem}
    />
  );
}

const PayrollRow = memo(function PayrollRow({ item, showName, onPress }) {
  const net = item.netSalary ?? item.netPay ?? item.amount;
  const pending = num(item.pendingAmount);
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => onPress(item)}>
      <ListItem
        emoji="💰"
        emojiBg="#E0E7FF"
        title={formatPeriod(item.period || item.month)}
        subtitle={showName ? staffNameOf(item) : pending > 0 ? `Pending ${formatMoney(pending)}` : "Tap for details"}
        meta={item.totalDeduction ? `Deductions ${formatMoney(item.totalDeduction)}` : undefined}
        right={
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{formatMoney(net)}</Text>
            {item.status ? <Badge label={item.status} tone={toneForStatus(item.status)} /> : null}
          </View>
        }
      />
    </TouchableOpacity>
  );
});

// ── Details of one month ─────────────────────────────────────────────────
function Line({ label, value, sub, color, bold }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: bold ? colors.text : colors.textMuted, fontWeight: bold ? "700" : "500" }}>
          {label}
        </Text>
        {sub ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 13, fontWeight: bold ? "800" : "600", color: color || colors.text }}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <Card style={{ marginBottom: 12, paddingVertical: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginBottom: 2 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </Card>
  );
}

export function PayrollDetails({ item, showName, onBack }) {
  const info = item.attendanceInfo || {};
  const allowances = Array.isArray(item.allowances) ? item.allowances.filter((a) => num(a.amount)) : [];
  const deductions = Array.isArray(item.deductions) ? item.deductions.filter((d) => num(d.amount)) : [];
  const payments = Array.isArray(item.payments) ? item.payments.filter((p) => num(p.amount)) : [];
  const basic = num(item.basicSalary);
  const adjusted = item.adjustedBasicSalary != null ? num(item.adjustedBasicSalary) : null;
  const leaveDeduction = num(info.leaveDeduction);
  const net = num(item.netSalary ?? item.netPay ?? item.amount);
  const totalPayable = item.totalPayable != null ? num(item.totalPayable) : net;
  const paid = num(item.paidAmount);
  const pending = item.pendingAmount != null ? num(item.pendingAmount) : Math.max(0, totalPayable - paid);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={onBack} hitSlop={8} style={{ marginBottom: 12, alignSelf: "flex-start" }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>‹ All months</Text>
      </TouchableOpacity>

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{formatPeriod(item.period || item.month)}</Text>
          {item.status ? <Badge label={item.status} tone={toneForStatus(item.status)} /> : null}
        </View>
        {showName ? (
          <Text style={{ color: "#fff", opacity: 0.85, fontSize: 13, marginTop: 2 }}>{staffNameOf(item)}</Text>
        ) : null}
        <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12, marginTop: 10 }}>Net salary</Text>
        <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>{money2(net)}</Text>
      </View>

      {info.payableDays != null || info.totalWorkingDays != null ? (
        <Section title="Attendance">
          {info.totalWorkingDays != null ? <Line label="Days in month" value={String(info.totalWorkingDays)} /> : null}
          {info.payableDays != null ? <Line label="Payable days" value={String(info.payableDays)} /> : null}
          {num(info.unpaidLeaves) ? (
            <Line label="Unpaid leave" value={`${info.unpaidLeaves} day(s)`} color={colors.danger} />
          ) : null}
        </Section>
      ) : null}

      <Section title="Earnings">
        <Line label="Basic salary" value={money2(basic)} />
        {adjusted != null && Math.abs(adjusted - basic) >= 0.01 ? (
          <Line label="Basic for payable days" value={money2(adjusted)} />
        ) : null}
        {allowances.map((a, i) => (
          <Line key={`a${i}`} label={a.type || a.name || "Allowance"} value={`+ ${money2(a.amount)}`} color={colors.success} />
        ))}
        {num(item.totalAllowance) ? (
          <Line label="Total allowances" value={`+ ${money2(item.totalAllowance)}`} color={colors.success} bold />
        ) : allowances.length === 0 ? (
          <Line label="Allowances" value="—" />
        ) : null}
      </Section>

      <Section title="Deductions">
        {deductions.map((d, i) => (
          <Line key={`d${i}`} label={d.type || d.name || "Deduction"} value={`− ${money2(d.amount)}`} color={colors.danger} />
        ))}
        {leaveDeduction ? <Line label="Leave deduction" value={`− ${money2(leaveDeduction)}`} color={colors.danger} /> : null}
        {num(item.advanceDeduction) ? (
          <Line label="Advance recovered" value={`− ${money2(item.advanceDeduction)}`} color={colors.danger} />
        ) : null}
        {num(item.totalDeduction) ? (
          <Line label="Total deductions" value={`− ${money2(item.totalDeduction)}`} color={colors.danger} bold />
        ) : deductions.length === 0 && !leaveDeduction && !num(item.advanceDeduction) ? (
          <Line label="No deductions" value={money2(0)} />
        ) : null}
        <Divider />
        <Line label="Net salary" value={money2(net)} bold />
      </Section>

      <Section title="Payment">
        <Line label="Total payable" value={money2(totalPayable)} />
        <Line label="Paid" value={money2(paid)} color={colors.success} />
        <Line label="Pending" value={money2(pending)} color={pending > 0 ? colors.warning : colors.text} bold />
        {payments.map((p, i) => (
          <Line
            key={`p${i}`}
            label={p.date ? formatShortDate(p.date) : `Payment ${i + 1}`}
            sub={[p.method || p.paymentMethod, p.note || p.reference].filter(Boolean).join(" · ") || undefined}
            value={money2(p.amount)}
          />
        ))}
        {item.paymentDate ? <Line label="Payment date" value={formatShortDate(item.paymentDate)} /> : null}
        {item.paymentMethod ? (
          <Line label="Method" value={String(item.paymentMethod).replace(/[-_]/g, " ")} />
        ) : null}
      </Section>

      {item.remarks || item.note ? (
        <Section title="Remarks">
          <Text style={{ fontSize: 13, color: colors.text, paddingVertical: 4 }}>{item.remarks || item.note}</Text>
        </Section>
      ) : null}
    </ScrollView>
  );
}

// ── Super admin: every staff name first → tap → that person's months ────
const byPeriodDesc = (a, b) => String(b.period || b.month || "").localeCompare(String(a.period || a.month || ""));

function PayrollByStaff() {
  const loader = useListLoader(() => payrollService.getAll(), "Could not load payroll.");
  const { staff, loading: staffLoading } = useStaffMap(true);
  const [openId, setOpenId] = useState(null);
  const [selected, setSelected] = useState(null);

  // Back: month details → that staff's months → all staff.
  React.useEffect(() => {
    if (!openId && !selected) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selected) setSelected(null);
      else setOpenId(null);
      return true;
    });
    return () => sub.remove();
  }, [openId, selected]);

  const groups = useMemo(() => {
    const by = new Map();
    // Every staff member is listed, even before their first payroll.
    staff.forEach((st) => by.set(String(st._id), { id: String(st._id), name: st.staffName, photoUrl: st.photoUrl, items: [] }));
    loader.items.forEach((p) => {
      const id = idOf(p.employeeId) || staffNameOf(p);
      if (!by.has(id)) by.set(id, { id, name: staffNameOf(p), photoUrl: null, items: [] });
      by.get(id).items.push(p);
    });
    return [...by.values()]
      .map((g) => {
        const items = g.items.sort(byPeriodDesc);
        return {
          ...g,
          items,
          totalNet: items.reduce((sum, p) => sum + num(p.netSalary ?? p.netPay ?? p.amount), 0),
          pending: items.reduce((sum, p) => sum + num(p.pendingAmount), 0),
          latest: items[0]?.period || items[0]?.month || null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, loader.items]);

  const totals = useMemo(
    () => ({
      net: groups.reduce((s, g) => s + g.totalNet, 0),
      pending: groups.reduce((s, g) => s + g.pending, 0),
    }),
    [groups],
  );

  if (loader.loading || (staffLoading && !staff.length)) return <Loading />;

  if (selected) return <PayrollDetails item={selected} showName onBack={() => setSelected(null)} />;

  const open = groups.find((g) => g.id === openId);
  if (open) {
    return (
      <FlatList
        style={{ flex: 1, backgroundColor: colors.screen }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        data={open.items}
        keyExtractor={(p, i) => p._id || String(i)}
        ListHeaderComponent={
          <>
            <BackLink label="All staff" onPress={() => setOpenId(null)} />
            <TotalsHeader
              title={`${open.name} · month-wise payroll`}
              items={[
                { label: "Total net salary", value: formatMoney(open.totalNet) },
                { label: "Pending", value: formatMoney(open.pending) },
                { label: "Months", value: String(open.items.length) },
              ]}
            />
          </>
        }
        ListEmptyComponent={<EmptyState emoji="💰" message="No payroll for this staff member yet." />}
        renderItem={({ item }) => <PayrollRow item={item} showName={false} onPress={setSelected} />}
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={groups}
      keyExtractor={(g) => g.id}
      refreshControl={<RefreshControl refreshing={loader.refreshing} onRefresh={loader.refresh} tintColor={colors.primary} />}
      initialNumToRender={12}
      ListHeaderComponent={
        <TotalsHeader
          title="Payroll — all staff"
          items={[
            { label: "Total net salary", value: formatMoney(totals.net) },
            { label: "Pending", value: formatMoney(totals.pending) },
            { label: "Staff", value: String(groups.length) },
          ]}
        />
      }
      ListEmptyComponent={<EmptyState emoji="💰" message={loader.error || "No staff found."} />}
      renderItem={({ item: g }) => (
        <StaffRow
          name={g.name}
          photoUrl={g.photoUrl}
          subtitle={g.items.length ? `${g.items.length} month${g.items.length === 1 ? "" : "s"} · latest ${formatPeriod(g.latest)}` : "No payroll yet"}
          meta={g.pending > 0 ? `Pending ${formatMoney(g.pending)}` : undefined}
          amount={g.items.length ? formatMoney(g.totalNet) : undefined}
          onPress={() => setOpenId(g.id)}
        />
      )}
    />
  );
}
