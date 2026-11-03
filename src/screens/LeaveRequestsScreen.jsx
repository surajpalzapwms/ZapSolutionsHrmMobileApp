// src/screens/LeaveRequestsScreen.jsx — Home → Leave.
//
// Same layout as the Activity tab (components/LeaveActivityCards.jsx): purple section titles
// with a count and "View all ›", white rounded cards, one block per request with
// label : value rows, status badge and full-width Approve / Reject.
//
//   Staff:  "Apply for Leave" card + "My Leave Requests" (all statuses, filterable).
//   Admin:  "Leave requests" → Pending (Approve / Reject) + Leave History (Approved / Rejected / All)
//           "Staff-wise leave" → every staff member and the leave they took (unchanged).
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import LeaveByStaff from "../components/LeaveByStaff";
import DateField from "../components/DateField";
import { useAuth } from "../contexts/AuthContext";
import {
  FilterChips,
  LeaveRequestSection,
  SectionHeader,
  activityStyles,
  confirmLeaveDecision,
  groupLeaveRequests,
} from "../components/LeaveActivityCards";
import { colors, radius } from "../theme/colors";

// How many requests each section shows before "View all ›".
const SHOW_COUNT = 3;

const TYPE_OPTIONS = [
  { value: LEAVE_TYPES.PAID, label: "Paid" },
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: LEAVE_TYPES.UNPAID, label: "Unpaid" },
  { value: LEAVE_TYPES.SWAP, label: "Swap" },
];

const STATUS_FILTERS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];
const HISTORY_FILTERS = [
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["all", "All"],
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const errText = (e, fallback) => e?.response?.data?.message || fallback;

export default function LeaveRequestsScreen() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <AdminLeave />;
  return <StaffLeaveRequests />;
}

// Pill switch at the top of the admin view.
function Segment({ value, onChange }) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.track,
        borderRadius: radius.pill,
        padding: 4,
        marginTop: 16,
      }}
    >
      {[
        ["requests", "Leave requests"],
        ["staff", "Staff-wise leave"],
      ].map(([key, label]) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.pill,
              alignItems: "center",
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Admin / super admin
// ---------------------------------------------------------------------------
function AdminLeave() {
  const { isViewOnly } = useAuth();
  const [tab, setTab] = useState("requests");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [history, setHistory] = useState("approved");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await attendanceService.getAllLeaveRequests({});
      setRows(unwrapList(res.data));
    } catch (e) {
      setError(errText(e, "Could not load leave requests."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => groupLeaveRequests(rows), [rows]);
  const pending = useMemo(() => groups.filter((g) => g.status === "pending"), [groups]);
  const past = useMemo(
    () => groups.filter((g) => g.status !== "pending" && (history === "all" || g.status === history)),
    [groups, history]
  );

  const decide = (g, approve) => confirmLeaveDecision(g, approve, { setBusyKey, onDone: load });

  return (
    <ScrollView
      style={activityStyles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        tab === "requests" ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      <Segment value={tab} onChange={setTab} />

      {tab === "staff" ? (
        <View style={{ marginTop: 16 }}>
          <LeaveByStaff />
        </View>
      ) : (
        <>
          <LeaveRequestSection
            title="Pending Leave Requests"
            groups={pending}
            loading={loading}
            error={error}
            emptyText="No pending leave requests."
            showCount={SHOW_COUNT}
            showName
            canDecide={!isViewOnly}
            busyKey={busyKey}
            onDecide={decide}
          />

          <LeaveRequestSection
            title="Leave History"
            groups={past}
            loading={loading}
            error={error}
            emptyText={history === "rejected" ? "No rejected leave." : history === "approved" ? "No approved leave." : "No leave history."}
            showCount={SHOW_COUNT}
            showName
          >
            <FilterChips options={HISTORY_FILTERS} value={history} onChange={setHistory} />
          </LeaveRequestSection>
        </>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
function StaffLeaveRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");

  const today = toDateKey();
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES.PAID);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await attendanceService.getMyLeaveRequests();
      setRows(unwrapList(res.data));
    } catch (e) {
      setLoadError(errText(e, "Could not load leave requests."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => groupLeaveRequests(rows), [rows]);
  const shown = useMemo(() => (filter === "all" ? groups : groups.filter((g) => g.status === filter)), [groups, filter]);

  const onFrom = (v) => {
    setFromDate(v);
    if (toDate < v) setToDate(v);
  };

  const handleSubmit = async () => {
    setError("");
    setNotice("");
    if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) return setError("Please pick the From and To dates.");
    if (toDate < fromDate) return setError("'To' date can't be before 'From' date.");
    if (!reason.trim()) return setError("Please enter a reason.");
    setSubmitting(true);
    try {
      const res = await attendanceService.submitLeaveRequest({ fromDate, toDate, reason: reason.trim(), leaveType });
      setReason("");
      setNotice(res.data?.message || "Leave request submitted.");
      setFilter("all");
      await load();
    } catch (e) {
      setError(errText(e, "Could not submit request."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={activityStyles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
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
      <SectionHeader title="Apply for Leave" />
      <View style={[activityStyles.card, { paddingVertical: 16 }]}>
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
            <DateField value={fromDate} onChange={onFrom} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>To</Text>
            <DateField value={toDate} onChange={setToDate} minDate={fromDate} />
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

        {error ? <Text style={{ color: colors.danger, fontSize: 12.5, marginTop: 10 }}>{error}</Text> : null}
        {notice ? <Text style={{ color: colors.success, fontSize: 12.5, marginTop: 10 }}>{notice}</Text> : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          style={[activityStyles.btn, { backgroundColor: colors.primary, marginTop: 14, flex: 0, opacity: submitting ? 0.6 : 1 }]}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={activityStyles.btnText}>Submit request</Text>}
        </TouchableOpacity>
      </View>

      <LeaveRequestSection
        title="My Leave Requests"
        groups={shown}
        loading={loading}
        error={loadError}
        emptyText={filter === "all" ? "No leave requests yet." : `No ${filter} leave requests.`}
        showCount={SHOW_COUNT}
      >
        {groups.length ? <FilterChips options={STATUS_FILTERS} value={filter} onChange={setFilter} /> : null}
      </LeaveRequestSection>
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
