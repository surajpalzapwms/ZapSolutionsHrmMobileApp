// src/screens/AdminLettersScreen.jsx — admin / super admin.
// Letters are NEVER locked here: pick any staff member, generate ANY of the
// six letters (which unlocks it in that person's app), view / download the
// very same PDF the website makes, or withdraw it.
//   Termination — pick any staff member + last working day (any date).
//   Leaving / Experience — last working day comes from the resignation, or
//   pick any date (today / future for someone still working).
// Below: every letter of this type generated before, newest first.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import StaffPicker, { useAllStaff } from "../components/StaffPicker";
import { useAuth } from "../contexts/AuthContext";
import Avatar from "../components/Avatar";
import { Badge, Card, SectionTitle } from "../components/ModuleUI";
import { getIssuedLetters, getStaffLetters, revokeLetter } from "../services/letterService";
import { LETTER_TYPES, RELIEVING_LETTERS, downloadLetterPdf, viewLetterPdf } from "../utils/letters";
import LetterDetailsSheet from "../components/LetterDetailsSheet";
import { colors, radius } from "../theme/colors";
import { formatShortDate } from "../utils/format";

export default function AdminLettersScreen({ initialType = "offer" }) {
  // View-only (super admin inside a client company): letters can be viewed / downloaded, not generated or withdrawn.
  const { isViewOnly } = useAuth();
  const [type, setType] = useState(initialType);
  const { staff, loading: staffLoading } = useAllStaff(true);
  const [selected, setSelected] = useState(null);
  // All six rows for the selected staff member — switching the letter type
  // just picks another row (no new server call).
  const [rows, setRows] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // "Generate" opens the details form (all six letters) for the selected staff.
  const [formOpen, setFormOpen] = useState(false);

  const label = LETTER_TYPES.find((l) => l.key === type)?.label || "Letter";

  // Every generated letter is loaded once; switching the type only filters.
  const [allHistory, setAllHistory] = useState([]);
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setAllHistory(await getIssuedLetters());
    } catch {
      setAllHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);
  const history = allHistory.filter((h) => h.type === type);

  const loadStatus = useCallback(async () => {
    if (!selected?._id) return setRows(null);
    setStatusLoading(true);
    try {
      setRows(await getStaffLetters(selected._id));
    } catch {
      setRows(null);
    } finally {
      setStatusLoading(false);
    }
  }, [selected]);
  const status = rows ? rows.find((r) => r.type === type) || null : null;

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

  // Every letter asks for its details first (name, Mr./Ms., designation,
  // salary… / last working day), same form as the website.
  const generate = () => setFormOpen(true);

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

  // The PDF comes from the server — identical to the website's.
  const download = async (staffObj, letterType, issuedAt) => {
    setBusy(`dl-${staffObj._id}-${letterType}`);
    try {
      await downloadLetterPdf(letterType, staffObj, issuedAt, { staffId: staffObj._id });
    } catch (e) {
      Alert.alert("Download failed", e?.message || "Couldn't get the PDF. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const view = async (staffObj, letterType) => {
    setBusy(`view-${staffObj._id}-${letterType}`);
    try {
      await viewLetterPdf(letterType, staffObj, { staffId: staffObj._id });
    } catch (e) {
      Alert.alert("Couldn't open the letter", e?.message || "Please try again.");
    } finally {
      setBusy("");
    }
  };

  // Relieving letters need the last working day chosen in the form first.
  const canOpen = !!status && status.eligible && (status.issued || !RELIEVING_LETTERS.includes(type));

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
                    ? `Not generated yet — ${selected.staffName} sees it locked.${
                        RELIEVING_LETTERS.includes(type) ? " Tap Generate to choose the last working day (any date)." : ""
                      }`
                    : status.reason}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {status.eligible && !isViewOnly ? (
                  <Btn
                    label={status.issued ? "✎ Edit & generate again" : "✨ Generate"}
                    primary
                    busy={busy === "issue"}
                    onPress={generate}
                  />
                ) : null}
                {canOpen ? (
                  <Btn
                    label="👁 View"
                    busy={busy === `view-${selected._id}-${type}`}
                    onPress={() => view(selected, type)}
                  />
                ) : null}
                {canOpen ? (
                  <Btn
                    label="⬇ PDF"
                    busy={busy === `dl-${selected._id}-${type}`}
                    onPress={() => download(selected, type, status.issuedAt)}
                  />
                ) : null}
                {status.issued && !isViewOnly ? (
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
            <Btn label="👁" busy={busy === `view-${h.staff._id}-${h.type}`} onPress={() => view(h.staff, h.type)} />
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
