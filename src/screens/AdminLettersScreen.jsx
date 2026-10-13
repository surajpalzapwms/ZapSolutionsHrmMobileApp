// src/screens/AdminLettersScreen.jsx — admin / super admin.
// Letters are NEVER locked here: pick any staff member, generate the letter
// (which unlocks it in that person's app), download it, or withdraw it.
// Below: every letter of this type generated before, newest first.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import StaffPicker, { useAllStaff } from "../components/StaffPicker";
import Avatar from "../components/Avatar";
import { Badge, Card, SectionTitle } from "../components/ModuleUI";
import { getIssuedLetters, getStaffLetters, issueLetter, revokeLetter } from "../services/letterService";
import { LETTER_TYPES, SERVER_LETTERS, buildLetter, downloadLetterPdf } from "../utils/letters";
import LetterDetailsSheet from "../components/LetterDetailsSheet";
import { colors, radius } from "../theme/colors";
import { formatShortDate } from "../utils/format";

export default function AdminLettersScreen({ initialType = "offer" }) {
  const [type, setType] = useState(initialType);
  const { staff, loading: staffLoading } = useAllStaff(true);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // this staff member's row for `type`
  const [statusLoading, setStatusLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Offer / Joining / Confirmation: details form open for the selected staff.
  const [formOpen, setFormOpen] = useState(false);

  const label = LETTER_TYPES.find((l) => l.key === type)?.label || "Letter";

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getIssuedLetters(type));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [type]);

  const loadStatus = useCallback(async () => {
    if (!selected?._id) return setStatus(null);
    setStatusLoading(true);
    try {
      const rows = await getStaffLetters(selected._id);
      setStatus(rows.find((r) => r.type === type) || null);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [selected, type]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHistory(), loadStatus()]);
    setRefreshing(false);
  };

  const generate = async () => {
    // These ask for any missing details (name, Mr./Ms., designation, salary…).
    if (SERVER_LETTERS.includes(type)) {
      setFormOpen(true);
      return;
    }
    setBusy("issue");
    try {
      const res = await issueLetter(selected._id, type);
      Alert.alert("Generated", `${res?.message || label + " generated"}. ${selected.staffName} can now open it in the app.`);
      await Promise.all([loadStatus(), loadHistory()]);
    } catch (e) {
      Alert.alert("Couldn't generate", e.response?.data?.message || "Please try again.");
    } finally {
      setBusy("");
    }
  };

  const withdraw = (staffObj, letterType) => {
    Alert.alert("Withdraw letter?", `${staffObj.staffName} will no longer see this letter.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          setBusy(`revoke-${staffObj._id}`);
          try {
            await revokeLetter(staffObj._id, letterType);
            await Promise.all([loadStatus(), loadHistory()]);
          } catch (e) {
            Alert.alert("Couldn't withdraw", e.response?.data?.message || "Please try again.");
          } finally {
            setBusy("");
          }
        },
      },
    ]);
  };

  const afterFormGenerated = async (message) => {
    Alert.alert("Generated", `${message}. ${selected?.staffName} can now open it in the app.`);
    await Promise.all([loadStatus(), loadHistory()]);
  };

  // Full staff record (dates) is needed to build the PDF on the phone.
  const fullStaff = (id) => staff.find((s) => String(s._id) === String(id));

  const download = async (staffObj, letterType, issuedAt) => {
    const full = fullStaff(staffObj._id) || staffObj;
    const letter = buildLetter(letterType, full);
    if (letter.missing && !SERVER_LETTERS.includes(letterType)) {
      Alert.alert("Missing details", letter.missing.replace("on your profile", "on this staff profile"));
      return;
    }
    setBusy(`dl-${staffObj._id}-${letterType}`);
    try {
      await downloadLetterPdf(letterType, full, issuedAt, { staffId: staffObj._id });
    } catch (e) {
      Alert.alert("Download failed", e?.message || "Couldn't generate the PDF. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Letter type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {LETTER_TYPES.map((l) => {
          const active = l.key === type;
          return (
            <TouchableOpacity
              key={l.key}
              onPress={() => setType(l.key)}
              style={{
                marginRight: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary : colors.card,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>
                {l.emoji} {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SectionTitle>Generate {label}</SectionTitle>
      {staffLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <StaffPicker staff={staff} selected={selected} onSelect={setSelected} title="LETTER FOR" />
      )}

      {selected ? (
        <Card style={{ marginTop: 12 }}>
          {statusLoading || !status ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{label}</Text>
                <Badge
                  label={status.issued ? "Generated" : status.eligible ? "Ready" : "Not eligible"}
                  tone={status.issued ? "success" : status.eligible ? "primary" : "warning"}
                />
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                {status.issued
                  ? `Generated ${formatShortDate(status.issuedAt)}${status.issuedByName ? ` by ${status.issuedByName}` : ""}`
                  : status.eligible
                    ? "Not generated yet — the staff member sees it locked."
                    : status.reason}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {status.eligible ? (
                  <Btn
                    label={status.issued ? (SERVER_LETTERS.includes(type) ? "✎ Edit & generate again" : "Generate again") : "✨ Generate"}
                    primary
                    busy={busy === "issue"}
                    onPress={generate}
                  />
                ) : null}
                {status.eligible ? (
                  <Btn
                    label="⬇ PDF"
                    busy={busy === `dl-${selected._id}-${type}`}
                    onPress={() => download(selected, type, status.issuedAt)}
                  />
                ) : null}
                {status.issued ? (
                  <Btn label="Withdraw" danger busy={busy === `revoke-${selected._id}`} onPress={() => withdraw(selected, type)} />
                ) : null}
              </View>
            </>
          )}
        </Card>
      ) : null}

      <LetterDetailsSheet
        visible={formOpen && !!selected}
        onClose={() => setFormOpen(false)}
        staff={selected}
        type={type}
        title={label}
        onGenerated={afterFormGenerated}
      />

      <SectionTitle style={{ marginTop: 22 }}>
        Previously generated · {historyLoading ? "…" : history.length}
      </SectionTitle>
      {historyLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : history.length === 0 ? (
        <Card>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>No {label.toLowerCase()} generated yet.</Text>
        </Card>
      ) : (
        history.map((h) => (
          <Card key={`${h.staff._id}-${h.type}`} style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={h.staff.staffName} uri={h.staff.photoUrl} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                {h.staff.staffName}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                {formatShortDate(h.issuedAt)}
                {h.issuedByName ? ` · by ${h.issuedByName}` : ""}
                {h.letterDate ? ` · dated ${formatShortDate(h.letterDate)}` : ""}
              </Text>
            </View>
            <Btn
              label="⬇"
              busy={busy === `dl-${h.staff._id}-${h.type}`}
              onPress={() => download(h.staff, h.type, h.issuedAt)}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function Btn({ label, onPress, primary, danger, busy }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      style={{
        minWidth: 44,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        alignItems: "center",
        backgroundColor: primary ? colors.primary : danger ? colors.dangerSoft : colors.primarySoft,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={primary ? "#fff" : colors.primary} />
      ) : (
        <Text style={{ fontSize: 12, fontWeight: "700", color: primary ? "#fff" : danger ? colors.danger : colors.primary }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
