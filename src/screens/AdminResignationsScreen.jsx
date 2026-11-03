// src/screens/AdminResignationsScreen.jsx — admin / super admin: every staff
// member's resignation requests (same data as the website's "Resignations"
// page). Approve a pending request, or reject it with optional remarks — a
// rejected staff member can then apply again from their own Resign screen,
// and can withdraw a pending request themselves.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Badge, Card, toneForStatus } from "../components/ModuleUI";
import { prettyYMD } from "../components/DateField";
import { colors, radius } from "../theme/colors";

const FILTERS = ["pending", "approved", "rejected", "withdrawn", "all"];

const ymdFromServer = (v) => (v ? String(v).slice(0, 10) : "");
const todayYMD = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// "your reason [Admin: remarks]" → { text, remarks }
const splitAdminRemarks = (reason = "") => {
  const m = String(reason).match(/^([\s\S]*?)\s*\[Admin:\s*([\s\S]*?)\]\s*$/);
  return m ? { text: m[1].trim(), remarks: m[2].trim() } : { text: String(reason).trim(), remarks: "" };
};

const staffName = (r) => r.userId?.staffName || r.staffName || "Unknown staff";
const staffEmail = (r) => r.userId?.email || r.email || "";

export default function AdminResignationsScreen() {
  const { isViewOnly } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  // Reject dialog
  const [rejecting, setRejecting] = useState(null); // the resignation being rejected
  const [remarks, setRemarks] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/api/hrm/resignations/all");
      const list = res.data?.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load resignation requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((r) => (r.status || "pending") === filter)),
    [items, filter],
  );
  const pendingCount = useMemo(() => items.filter((r) => (r.status || "pending") === "pending").length, [items]);

  const approve = (r) => {
    const lwd = ymdFromServer(r.lastWorkingDay);
    const past = lwd && lwd <= todayYMD();
    Alert.alert(
      "Approve resignation?",
      past
        ? `${staffName(r)}'s last working day (${prettyYMD(lwd)}) has already passed. They will be marked as Relieved right away and lose access to the app.`
        : `${staffName(r)} will be marked as Relieved after their last working day (${prettyYMD(lwd)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setActingId(r._id);
            try {
              await api.put(`/api/hrm/resignations/${r._id}/approve`, {});
              await load();
            } catch (e) {
              Alert.alert("Couldn't approve", e.response?.data?.message || "Please try again.");
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  };

  const confirmReject = async () => {
    const r = rejecting;
    if (!r) return;
    setActingId(r._id);
    try {
      await api.put(`/api/hrm/resignations/${r._id}/reject`, { remarks: remarks.trim() || undefined });
      setRejecting(null);
      setRemarks("");
      await load();
    } catch (e) {
      Alert.alert("Couldn't reject", e.response?.data?.message || "Please try again.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: on ? colors.primary : colors.track,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: on ? "#fff" : colors.textMuted, textTransform: "capitalize" }}>
                  {f}
                  {f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 40, gap: 12 }}
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
        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

        {!error && visible.length === 0 ? (
          <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 30 }}>
            No {filter !== "all" ? filter : ""} resignation requests.
          </Text>
        ) : null}

        {visible.map((r) => {
          const status = r.status || "pending";
          const parts = splitAdminRemarks(r.reason);
          const busy = actingId === r._id;
          return (
            <Card key={r._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{staffName(r)}</Text>
                  {staffEmail(r) ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{staffEmail(r)}</Text> : null}
                </View>
                <Badge label={status} tone={toneForStatus(status)} />
              </View>

              <Text style={{ fontSize: 13, color: colors.text, marginTop: 10 }}>
                Last working day: <Text style={{ fontWeight: "700" }}>{prettyYMD(ymdFromServer(r.lastWorkingDay))}</Text>
              </Text>
              {r.createdAt ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Submitted {prettyYMD(ymdFromServer(r.createdAt))}
                </Text>
              ) : null}

              {parts.text ? (
                <Text style={{ fontSize: 13, color: colors.text, marginTop: 10, lineHeight: 19 }}>{parts.text}</Text>
              ) : null}
              {parts.remarks ? (
                <Text style={{ fontSize: 12, color: colors.danger, marginTop: 8 }}>Admin remarks: {parts.remarks}</Text>
              ) : null}

              {status === "pending" && !isViewOnly ? (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => approve(r)}
                    disabled={busy}
                    activeOpacity={0.85}
                    style={{ flex: 1, backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: 11, alignItems: "center", opacity: busy ? 0.6 : 1 }}
                  >
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Approve</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setRemarks("");
                      setRejecting(r);
                    }}
                    disabled={busy}
                    activeOpacity={0.85}
                    style={{ flex: 1, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: 11, alignItems: "center", opacity: busy ? 0.6 : 1 }}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "700" }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>

      {/* Reject dialog with optional remarks */}
      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: radius.lg, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>Reject resignation</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {rejecting ? staffName(rejecting) : ""} will be able to apply again.
            </Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              multiline
              placeholder="Remarks for the staff member (optional)"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F9FAFB",
                borderRadius: radius.sm,
                padding: 12,
                minHeight: 80,
                textAlignVertical: "top",
                fontSize: 14,
                color: colors.text,
                marginTop: 12,
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setRejecting(null)}
                disabled={!!actingId}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 11, alignItems: "center" }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmReject}
                disabled={!!actingId}
                style={{ flex: 1, backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 11, alignItems: "center", opacity: actingId ? 0.6 : 1 }}
              >
                {actingId ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
