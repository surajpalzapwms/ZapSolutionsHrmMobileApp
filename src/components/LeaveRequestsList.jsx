// src/components/LeaveRequestsList.jsx — "My leave requests" rows (grouped by batch).
import React from "react";
import { Text, View } from "react-native";
import { Badge, Divider, toneForStatus } from "./ModuleUI";
import { colors } from "../theme/colors";
import { formatShortDate } from "../utils/format";

const LEAVE_LABEL = {
  paid: "Paid Leave",
  unpaid: "Unpaid Leave",
  swapleave: "Swap Leave",
  sick: "Sick Leave",
  casual: "Casual Leave",
};

// Multi-day requests come back as one record per day sharing a batchId.
export function groupLeaves(raw = []) {
  const groups = new Map();
  raw.forEach((lr) => {
    const key = lr.batchId || lr.groupId || lr._id;
    const list = groups.get(key) || [];
    list.push(lr);
    groups.set(key, list);
  });
  const rows = Array.from(groups.values()).map((list) => {
    const dateOf = (x) => x.leaveDate || x.date || x.fromDate || "";
    const sorted = [...list].sort((a, b) => (dateOf(a) < dateOf(b) ? -1 : 1));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const type = first.leaveType || first.type;
    return {
      _id: first.batchId || first.groupId || first._id,
      fromDate: first.fromDate || dateOf(first),
      toDate: last.toDate || dateOf(last),
      status: first.status || "pending",
      reason: first.reason,
      leaveType: LEAVE_LABEL[type] || type || "Leave",
    };
  });
  rows.sort((a, b) => (a.fromDate < b.fromDate ? 1 : -1));
  return rows;
}

export default function LeaveRequestsList({ leaves }) {
  if (!leaves.length) {
    return <Text style={{ fontSize: 13, color: colors.textMuted }}>No leave requests yet.</Text>;
  }
  return (
    <View>
      {leaves.map((lr, i) => {
        const same = String(lr.fromDate).slice(0, 10) === String(lr.toDate).slice(0, 10);
        return (
          <View key={lr._id}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{lr.leaveType}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {same ? formatShortDate(lr.fromDate) : `${formatShortDate(lr.fromDate)} – ${formatShortDate(lr.toDate)}`}
                </Text>
                {lr.reason ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {lr.reason}
                  </Text>
                ) : null}
              </View>
              <Badge label={lr.status} tone={toneForStatus(lr.status)} />
            </View>
            {i < leaves.length - 1 ? <Divider /> : null}
          </View>
        );
      })}
    </View>
  );
}
