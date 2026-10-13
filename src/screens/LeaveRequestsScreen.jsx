// src/screens/LeaveRequestsScreen.jsx — apply for leave + see my requests.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { attendanceService } from "../services/attendanceService";
import { LEAVE_TYPES } from "../utils/constants";
import { unwrapList } from "../utils/helpers";
import { toDateKey } from "../utils/format";
import { Card, SectionTitle } from "../components/ModuleUI";
import AdminLeaveRequests from "../components/AdminLeaveRequests";
import LeaveByStaff from "../components/LeaveByStaff";
import { useAuth } from "../contexts/AuthContext";
import LeaveRequestsList, { groupLeaves } from "../components/LeaveRequestsList";
import { colors, radius } from "../theme/colors";

const TYPE_OPTIONS = [
  { value: LEAVE_TYPES.PAID, label: "Paid" },
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: LEAVE_TYPES.UNPAID, label: "Unpaid" },
  { value: LEAVE_TYPES.SWAP, label: "Swap" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function LeaveRequestsScreen() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <AdminLeave />;
  return <StaffLeaveRequests />;
}

// Admin / super admin: "Staff-wise" (every staff member → each leave they
// took) and "Requests" (approve / reject).
function AdminLeave() {
  const [tab, setTab] = useState("staff");
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", backgroundColor: colors.track, borderRadius: radius.pill, padding: 4, marginBottom: 14 }}>
        {[
          ["staff", "Staff-wise leave"],
          ["requests", "Leave requests"],
        ].map(([key, label]) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              activeOpacity={0.85}
              style={{ flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: "center", backgroundColor: active ? colors.primary : "transparent" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {tab === "staff" ? (
        <LeaveByStaff />
      ) : (
        <>
          <SectionTitle>Staff leave requests</SectionTitle>
          <Card>
            <AdminLeaveRequests />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function StaffLeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const today = toDateKey();
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES.PAID);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await attendanceService.getMyLeaveRequests();
      setLeaves(groupLeaves(unwrapList(res.data)));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load leave requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    setError("");
    setNotice("");
    if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
      setError("Dates must be in YYYY-MM-DD format.");
      return;
    }
    if (toDate < fromDate) {
      setError("'To' date can't be before 'From' date.");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await attendanceService.submitLeaveRequest({
        fromDate,
        toDate,
        reason: reason.trim(),
        leaveType,
      });
      setReason("");
      setNotice(res.data?.message || "Leave request submitted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <SectionTitle>Apply for leave</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <Text style={labelStyle}>Leave type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {TYPE_OPTIONS.map((opt) => {
            const active = leaveType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setLeaveType(opt.value)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>From</Text>
            <TextInput value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" style={inputStyle} placeholderTextColor={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>To</Text>
            <TextInput value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" style={inputStyle} placeholderTextColor={colors.textMuted} />
          </View>
        </View>

        <Text style={[labelStyle, { marginTop: 14 }]}>Reason</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason for leave"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[inputStyle, { minHeight: 70, textAlignVertical: "top" }]}
        />

        {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 10 }}>{error}</Text> : null}
        {notice ? <Text style={{ color: colors.success, fontSize: 12, marginTop: 10 }}>{notice}</Text> : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          style={{
            marginTop: 14,
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: 13,
            alignItems: "center",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Submit request</Text>
          )}
        </TouchableOpacity>
      </Card>

      <SectionTitle>My leave requests</SectionTitle>
      <Card>
        {loading ? <ActivityIndicator color={colors.primary} /> : <LeaveRequestsList leaves={leaves} />}
      </Card>
    </ScrollView>
  );
}

const labelStyle = { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: 6 };
const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: "#F9FAFB",
  borderRadius: radius.sm,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text,
};
