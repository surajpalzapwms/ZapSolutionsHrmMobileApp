// src/screens/PendingSalaryScreen.jsx — "Pending Salary" tab.
//
// Staff: every earlier month whose salary is not (fully) paid yet, newest
//        first, with the total still owed. The current month is skipped
//        (on 12 Oct: September, August… are shown, October is not).
//        Partly paid → only the unpaid part. Still shown after resigning
//        (up to the relieving month).
// Admin / super admin: every staff member (current + relieved) with what is
//        still owed to them → tap for their month-wise list.
// Rules: services/pendingSalaryService.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { getPendingSalary } from "../services/pendingSalaryService";
import { payrollService } from "../services/payrollService";
import { unwrapList } from "../utils/helpers";
import { hasLeftOrganization } from "../utils/staffStatus";
import { BackLink, StaffRow, TotalsHeader, useBackHandler, useStaffMap, idOf } from "../components/StaffWise";
import { Badge, Card } from "../components/ModuleUI";
import { EmptyState, Loading } from "../components/ScreenStates";
import { PayrollDetails } from "./PayrollScreen";
import { colors } from "../theme/colors";
import { formatMoney, formatPeriod } from "../utils/format";
import { cacheGet, cacheSet } from "../utils/appCache";

const KIND = {
  unpaid: { label: "Not paid", tone: "danger" },
  partial: { label: "Partly paid", tone: "warning" },
  not_generated: { label: "Not generated", tone: "primary" },
};

const joinOf = (s) => s?.date || s?.joiningDate || s?.dateOfJoining || null;
const relieveOf = (s) => (s?.status === "Relieved" ? s?.relievingDate || null : null);

export default function PendingSalaryScreen() {
  const { isAdmin } = useAuth();
  return isAdmin ? <PendingByStaff /> : <MyPendingSalary />;
}

// ── One staff member's months ───────────────────────────────────────────
function usePending(staff, hasLeft, enabled = true) {
  const id = staff?._id ? String(staff._id) : null;
  const cacheKey = `pendingSalary:${id}`;
  const [data, setData] = useState(() => cacheGet(cacheKey) || null);
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const res = await getPendingSalary({
        employeeId: id,
        joiningDate: joinOf(staff),
        relievingDate: relieveOf(staff),
        hasLeft,
      });
      cacheSet(cacheKey, res);
      setData(res);
    } catch (e) {
      if (!cacheGet(cacheKey)) setError(e?.response?.data?.message || "Could not load pending salary.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // staff fields used above only change with the id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, enabled, hasLeft, cacheKey]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, refreshing, error, refresh, reload: load };
}

function MyPendingSalary() {
  const { myProfile, hasLeft, profileLoading } = useAuth();
  const p = usePending(myProfile, hasLeft);
  const [selected, setSelected] = useState(null);
  useBackHandler(!!selected, () => setSelected(null));

  // Quietly refresh when the tab is opened again (a payment may be made).
  useFocusEffect(
    useCallback(() => {
      p.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [p.reload]),
  );

  if (!myProfile) {
    if (profileLoading) return <Loading />;
    return <EmptyState emoji="💼" message="No staff profile is linked to this account." />;
  }
  if (selected) return <PayrollDetails item={selected} showName={false} onBack={() => setSelected(null)} />;

  return (
    <MonthList
      pending={p}
      title={hasLeft ? "Salary still due to you (after relieving)" : "Salary still due to you"}
      onOpen={setSelected}
    />
  );
}

function MonthList({ pending, title, onOpen, header }) {
  const { data, loading, refreshing, error, refresh } = pending;
  if (loading && !data) return <Loading />;
  const items = data?.items || [];
  const now = new Date();
  const currentLabel = formatPeriod(`${now.getFullYear()}-${now.getMonth() + 1}`);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={items}
      keyExtractor={(it) => it.period}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <>
          {header}
          <TotalsHeader
            title={title}
            items={[
              { label: "Total pending", value: formatMoney(data?.total || 0) },
              { label: "Months", value: String(items.length) },
            ]}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>
            {currentLabel} is not counted until the month is over.
          </Text>
        </>
      }
      ListEmptyComponent={
        <EmptyState emoji="✅" message={error || "No pending salary — every earlier month is fully paid."} />
      }
      renderItem={({ item }) => <PendingMonthRow item={item} onOpen={onOpen} />}
    />
  );
}

function PendingMonthRow({ item, onOpen }) {
  const k = KIND[item.kind] || KIND.unpaid;
  let detail;
  if (item.kind === "partial") detail = `Paid ${formatMoney(item.paid)} of ${formatMoney(item.payable)}`;
  else if (item.kind === "unpaid") detail = `Nothing paid of ${formatMoney(item.payable)}`;
  else if (item.payable == null) detail = "Payroll not generated yet";
  else {
    detail = `Salary (estimate) ${formatMoney(item.salary)}`;
    if (item.advance) detail += ` − advance ${formatMoney(item.advance)}`;
  }
  const days =
    item.kind === "not_generated" && item.payableDays != null && item.totalDays != null
      ? `${item.payableDays}/${item.totalDays} days paid`
      : null;

  const content = (
    <Card style={{ marginBottom: 10, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{formatPeriod(item.period)}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{detail}</Text>
          {days ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{days}</Text> : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.danger }}>
            {item.payable == null && item.kind === "not_generated" ? "—" : formatMoney(item.pending)}
          </Text>
          <Badge label={k.label} tone={k.tone} />
        </View>
      </View>
    </Card>
  );

  if (item.record && onOpen) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={() => onOpen(item.record)}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ── Admin / super admin: all staff ──────────────────────────────────────
function PendingByStaff() {
  const { staff, loading: staffLoading } = useStaffMap(true);
  const [payroll, setPayroll] = useState(() => cacheGet("pendingSalary:allPayroll") || null);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState(null);

  const loadPayroll = useCallback(async () => {
    try {
      const res = await payrollService.getAll();
      const list = unwrapList(res.data);
      cacheSet("pendingSalary:allPayroll", list);
      setPayroll(list);
    } catch {
      setPayroll((cur) => cur || []);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  // Quick overview from the saved payroll only (no per-month estimates —
  // those load when a staff member is opened).
  const [groups, setGroups] = useState(null);
  useEffect(() => {
    if (!payroll || !staff.length) return;
    let cancelled = false;
    const byEmp = {};
    payroll.forEach((r) => {
      const id = idOf(r.employeeId);
      if (id) (byEmp[id] = byEmp[id] || []).push(r);
    });
    Promise.all(
      staff.map(async (s) => {
        const left = hasLeftOrganization(s);
        const res = await getPendingSalary({
          employeeId: String(s._id),
          joiningDate: joinOf(s),
          relievingDate: relieveOf(s),
          hasLeft: left,
          payroll: byEmp[String(s._id)] || [],
          withEstimates: false,
        }).catch(() => ({ items: [], total: 0 }));
        const notGenerated = res.items.filter((i) => i.kind === "not_generated").length;
        return { staff: s, left, total: res.total, months: res.items.length, notGenerated };
      }),
    ).then((list) => {
      if (cancelled) return;
      setGroups(
        list
          .filter((g) => g.months > 0)
          .sort((a, b) => b.total - a.total || a.staff.staffName?.localeCompare(b.staff.staffName || "")),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [payroll, staff]);

  useBackHandler(!!openId, () => setOpenId(null));

  const total = useMemo(() => (groups || []).reduce((s, g) => s + g.total, 0), [groups]);

  const open = openId ? staff.find((s) => String(s._id) === openId) : null;
  if (open) return <StaffPending staff={open} onBack={() => setOpenId(null)} />;

  if ((staffLoading && !staff.length) || !payroll || !groups) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={groups}
      keyExtractor={(g) => String(g.staff._id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadPayroll();
          }}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <>
          <TotalsHeader
            title="Pending salary — all staff"
            items={[
              { label: "Saved payroll pending", value: formatMoney(total) },
              { label: "Staff", value: String(groups.length) },
            ]}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>
            Current month not counted. Months with no payroll yet are counted separately — open a staff member to
            see their estimate.
          </Text>
        </>
      }
      ListEmptyComponent={<EmptyState emoji="✅" message="No pending salary for anyone." />}
      renderItem={({ item: g }) => (
        <StaffRow
          name={g.staff.staffName || g.staff.name || "Staff"}
          photoUrl={g.staff.photoUrl}
          subtitle={`${g.months} month${g.months === 1 ? "" : "s"} pending${g.left ? " · Relieved" : ""}`}
          meta={g.notGenerated ? `${g.notGenerated} month${g.notGenerated === 1 ? "" : "s"} payroll not generated` : undefined}
          amount={g.total ? formatMoney(g.total) : undefined}
          amountColor={colors.danger}
          onPress={() => setOpenId(String(g.staff._id))}
        />
      )}
    />
  );
}

function StaffPending({ staff, onBack }) {
  const left = hasLeftOrganization(staff);
  const p = usePending(staff, left);
  const [selected, setSelected] = useState(null);
  useBackHandler(!!selected, () => setSelected(null));
  if (selected) return <PayrollDetails item={selected} showName onBack={() => setSelected(null)} />;
  return (
    <MonthList
      pending={p}
      title={`${staff.staffName || "Staff"} · pending salary${left ? " (relieved)" : ""}`}
      onOpen={setSelected}
      header={<BackLink label="All staff" onPress={onBack} />}
    />
  );
}
