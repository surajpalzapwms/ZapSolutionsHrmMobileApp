// src/screens/SalarySlipScreen.jsx
// Same list layout as PayrollScreen (newest month first), but ONLY months
// whose salary is fully PAID are listed, each with a Download button that
// saves that month's salary slip as a PDF.
import React, { memo, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { payrollService } from "../services/payrollService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { ListItem } from "../components/ModuleUI";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius } from "../theme/colors";
import { formatMoney, formatPeriod } from "../utils/format";
import { downloadPayslipPdf } from "../utils/payslipPdf";

const staffNameOf = (item) =>
  item.staffName ||
  item.staff?.name ||
  (typeof item.employeeId === "object" && item.employeeId?.staffName) ||
  "Staff";

export default function SalarySlipScreen() {
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

const SlipRow = memo(function SlipRow({ item, showName, busy, onDownload }) {
  const net = item.netSalary ?? item.netPay ?? item.amount;
  return (
    <ListItem
      emoji="📄"
      emojiBg="#E0E7FF"
      title={formatPeriod(item.period || item.month)}
      subtitle={showName ? staffNameOf(item) : "✅ Paid"}
      meta={item.totalDeduction ? `Deductions ${formatMoney(item.totalDeduction)}` : undefined}
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
