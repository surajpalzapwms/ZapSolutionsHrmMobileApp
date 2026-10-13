// src/screens/ResignScreen.jsx — staff: apply for resignation, see its
// status, withdraw while pending. Once HR approves, the LAST WORKING DAY
// chosen here becomes the staff member's Relieved date (not the approval
// date). Same backend as the website's "My Resignation" page.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Badge, Card, SectionTitle, toneForStatus } from "../components/ModuleUI";
import DateField, { prettyYMD, ymdOf } from "../components/DateField";
import { colors, radius } from "../theme/colors";

const NOTICE_DAYS = 30;
const ymdFromServer = (v) => (v ? String(v).slice(0, 10) : "");

const daysFromToday = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((new Date(y, m - 1, d) - a) / 86400000);
};

export default function ResignScreen() {
  const { reloadMyProfile } = useAuth();
  const [resignation, setResignation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const today = ymdOf(new Date());
  const suggested = (() => {
    const d = new Date();
    d.setDate(d.getDate() + NOTICE_DAYS);
    return ymdOf(d);
  })();
  const [lastDay, setLastDay] = useState(suggested);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/api/hrm/resignations/me");
      setResignation(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load your resignation.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setError("");
    if (!lastDay) return setError("Please choose your last working day.");
    if (!reason.trim()) return setError("Please write a reason.");
    Alert.alert("Submit resignation?", `Last working day: ${prettyYMD(lastDay)}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            const res = await api.post("/api/hrm/resignations/me", {
              lastWorkingDay: lastDay,
              reason: reason.trim(),
              noticePeriodDays: NOTICE_DAYS,
            });
            setResignation(res.data?.data || null);
            setReason("");
          } catch (e) {
            setError(e.response?.data?.message || "Could not submit.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const withdraw = () => {
    Alert.alert("Withdraw resignation?", "You will continue working as before.", [
      { text: "No", style: "cancel" },
      {
        text: "Withdraw",
        onPress: async () => {
          setBusy(true);
          try {
            await api.delete("/api/hrm/resignations/me");
            await load();
            reloadMyProfile?.();
          } catch (e) {
            Alert.alert("Couldn't withdraw", e.response?.data?.message || "Please try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  // Pending / approved block a new request. A REJECTED request is closed —
  // the staff member can apply again (the apply form below stays visible).
  const active = resignation && ["pending", "approved"].includes(resignation.status);
  const rejected = resignation?.status === "rejected";
  const lwd = ymdFromServer(resignation?.lastWorkingDay);
  const left = lwd ? daysFromToday(lwd) : null;

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
      {resignation ? (
        <>
          <SectionTitle>My resignation</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Status</Text>
              <Badge label={resignation.status} tone={toneForStatus(resignation.status)} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Box label="Last working day" value={prettyYMD(lwd)} />
              {/* "Left 5 days ago" makes no sense for a rejected request. */}
              {rejected ? null : (
                <Box
                  label={left != null && left < 0 ? "Left" : "Days remaining"}
                  value={left == null ? "—" : left < 0 ? `${Math.abs(left)} days ago` : left === 0 ? "Today" : `${left} days`}
                />
              )}
            </View>
            {resignation.reason ? (
              <Text style={{ fontSize: 13, color: colors.text, marginTop: 14, lineHeight: 19 }}>{resignation.reason}</Text>
            ) : null}
            {rejected ? (
              <Text style={{ fontSize: 12, color: colors.danger, marginTop: 12 }}>
                Rejected. You can apply again — choose a new last working day below.
              </Text>
            ) : null}
            {resignation.status === "approved" ? (
              <Text style={{ fontSize: 12, color: colors.success, marginTop: 12 }}>
                Approved. Your relieving date is set to {prettyYMD(lwd)} — your last working day.
              </Text>
            ) : null}
            {resignation.status === "pending" ? (
              <TouchableOpacity
                onPress={withdraw}
                disabled={busy}
                style={{ marginTop: 14, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: 11, alignItems: "center" }}
              >
                {busy ? <ActivityIndicator color={colors.danger} /> : <Text style={{ color: colors.danger, fontWeight: "700" }}>Withdraw</Text>}
              </TouchableOpacity>
            ) : null}
          </Card>
        </>
      ) : null}

      {!active ? (
        <>
          <SectionTitle>Apply for resignation</SectionTitle>
          <Card>
            <DateField
              label="Last working day"
              value={lastDay}
              onChange={setLastDay}
              minDate={today}
            />
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
              Notice period is {NOTICE_DAYS} days — suggested last day {prettyYMD(suggested)}.
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 14, marginBottom: 6 }}>Reason</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Reason for leaving"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#F9FAFB",
                borderRadius: radius.sm,
                padding: 12,
                minHeight: 90,
                textAlignVertical: "top",
                fontSize: 14,
                color: colors.text,
              }}
            />
            {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 10 }}>{error}</Text> : null}
            <TouchableOpacity
              onPress={submit}
              disabled={busy}
              activeOpacity={0.85}
              style={{ marginTop: 14, backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Submit resignation</Text>}
            </TouchableOpacity>
          </Card>
        </>
      ) : error ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
      ) : null}
    </ScrollView>
  );
}

function Box({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.track, borderRadius: radius.md, padding: 12 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 3 }}>{value}</Text>
    </View>
  );
}
