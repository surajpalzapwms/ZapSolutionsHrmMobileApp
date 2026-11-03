
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { attendanceService } from "../services/attendanceService";
import { useAuth } from "../contexts/AuthContext";
import { Badge, Divider, toneForStatus } from "./ModuleUI";
import { colors, radius } from "../theme/colors";
import { formatShortDate } from "../utils/format";
import { unwrapList } from "../utils/helpers";

const LEAVE_LABEL = {
  paid: "Paid Leave",
  unpaid: "Unpaid Leave",
  swapleave: "Swap Leave",
  sick: "Sick Leave",
  casual: "Casual Leave",
};

export default function AdminLeaveRequests({ onlyPending = false, showActions: showActionsProp = true }) {
  // View-only (super admin inside a client company): no Approve / Reject.
  const { isViewOnly } = useAuth();
  const showActions = showActionsProp && !isViewOnly;
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await attendanceService.getAllLeaveRequests(filter === "all" ? {} : { status: filter });
      setItems(unwrapList(res.data));
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item, approve) => {
    setBusyId(item._id);
    try {
      if (approve) await attendanceService.approveLeaveRequest(item._id);
      else await attendanceService.rejectLeaveRequest(item._id, "");
      await load();
    } catch (e) {
      Alert.alert("Leave request", e.response?.data?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View>
      {!onlyPending ? (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {["pending", "approved", "rejected", "all"].map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? "#fff" : colors.textMuted,
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {filter === "pending" ? "No pending leave requests." : "No leave requests."}
        </Text>
      ) : (
        items.map((lr, i) => {
          const staff = lr.userId && typeof lr.userId === "object" ? lr.userId : null;
          const pending = lr.status === "pending";
          return (
            <View key={lr._id}>
              <View style={{ paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                      {staff?.staffName || "Staff member"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {LEAVE_LABEL[lr.leaveType] || lr.leaveType || "Leave"} · {formatShortDate(lr.leaveDate)}
                      {lr.isHalfDay ? " (half day)" : ""}
                    </Text>
                    {lr.reason ? (
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                        {lr.reason}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label={lr.status} tone={toneForStatus(lr.status)} />
                </View>

                {pending && showActions ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    {busyId === lr._id ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <ActionBtn label="Approve" bg={colors.success} onPress={() => decide(lr, true)} />
                        <ActionBtn label="Reject" bg={colors.danger} onPress={() => decide(lr, false)} />
                      </>
                    )}
                  </View>
                ) : null}
              </View>
              {i < items.length - 1 ? <Divider /> : null}
            </View>
          );
        })
      )}
    </View>
  );
}

function ActionBtn({ label, bg, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ flex: 1, backgroundColor: bg, borderRadius: radius.sm, paddingVertical: 8, alignItems: "center" }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}
