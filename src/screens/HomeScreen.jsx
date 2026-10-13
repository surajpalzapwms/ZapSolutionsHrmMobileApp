// src/screens/HomeScreen.jsx — same layout as the testing app's Home:
// gradient header, today's attendance card, birthday/holiday banner and a
// quick-action grid that opens each module in a slide-up sheet.
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";
import { useAttendance } from "../contexts/AttendanceContext";
import BirthdayBanner from "../components/BirthdayBanner";
import CornerLogo from "../components/CornerLogo";
import QuickActionSheet from "../components/QuickActionSheet";
import { colors, radius, shadow } from "../theme/colors";
import { formatClock } from "../utils/format";
import Avatar from "../components/Avatar";
import OfficeWifiCard from "../components/OfficeWifiCard";
import AttendanceNotifications from "../components/AttendanceNotifications";

import PayrollScreen from "./PayrollScreen";
import LeaveRequestsScreen from "./LeaveRequestsScreen";
import StaffListScreen from "./StaffListScreen";
import AdvanceListScreen from "./AdvanceListScreen";
import ExpensesListScreen from "./ExpensesListScreen";
import { SettlementCard, SettlementStatement } from "../components/Settlement";
import LetterScreen from "./LetterScreen";
import { LETTER_TYPES } from "../utils/letters";
import { getMyLetters } from "../services/letterService";
import MyDocumentsScreen from "./MyDocumentsScreen";
import ResignScreen from "./ResignScreen";
import PendingSalaryScreen from "./PendingSalaryScreen";
import { cacheGet, cacheLoad, cacheSet } from "../utils/appCache";

const LETTERS_CACHE = "myLetters";

const BG = {
  indigo: "#E0E7FF",
  pink: "#FCE7F3",
  amber: "#FEF3C7",
  emerald: "#D1FAE5",
};

// `sheet` actions open in the slide-up sheet; `tab` actions jump to a tab.
//   adminOnly  → only admin / super-admin (a promoted admin also needs the
//                matching `tabKey` permission, same as the website sidebar)
//   hideIfLeft → hidden for a staff member who has left the organization
// The six letters sit in the same grid, right after Payroll / Leave / Advances.
const LETTER_ACTIONS = LETTER_TYPES.map((l) => ({ ...l, letter: true }));

const QUICK_ACTIONS = [
  { key: "Payroll", label: "Payroll", emoji: "💰", bg: BG.indigo, sheet: PayrollScreen },
  { key: "Leave", label: "Leave", emoji: "⏰", bg: BG.pink, sheet: LeaveRequestsScreen, hideIfLeft: true },
  { key: "Advances", label: "Advances", emoji: "💵", bg: BG.emerald, sheet: AdvanceListScreen },
  ...LETTER_ACTIONS,
  // Staff: every admin and super-admin sees ALL staff with full details.
  { key: "Staff", label: "Staff", emoji: "👥", bg: BG.indigo, sheet: StaffListScreen, adminOnly: true, allAdmins: true },
  { key: "Expenses", label: "Expenses", emoji: "💸", bg: BG.amber, sheet: ExpensesListScreen, adminOnly: true, tabKey: "expenses" },
  // Office Wi-Fi setup (automatic attendance) — one tile like the others,
  // all its details open in the sheet.
  { key: "OfficeWifi", label: "Office Wi-Fi", emoji: "📶", bg: BG.emerald, sheet: OfficeWifiSheet, adminOnly: true, allAdmins: true },
  { key: "Settlement", label: "Settlement", emoji: "📄", bg: BG.indigo, sheet: SettlementStatement, onlyIfLeft: true },
  { key: "Documents", label: "My Documents", emoji: "🪪", bg: BG.emerald, sheet: MyDocumentsScreen },
  { key: "Resign", label: "Resign", emoji: "📝", bg: BG.pink, sheet: ResignScreen, hideIfLeft: true, staffOnly: true },
  // Pending Amount — right after Resign. Stays visible after the staff member
  // has resigned / been relieved, so they can still see what is owed to them.
  { key: "PendingAmount", label: "Pending Amount", emoji: "⌛", bg: BG.amber, sheet: PendingSalaryScreen },
];

function OfficeWifiSheet() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <OfficeWifiCard />
    </ScrollView>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, isAdmin, isSuperAdmin, canAccess, hasLeft, myProfile } = useAuth();
  const {
    attendance,
    loading,
    refreshing,
    actionLoading,
    error,
    hasClockedIn,
    hasClockedOut,
    refresh,
    clockIn,
    clockOut,
    presence,
    autoMode,
    enableAutoMode,
    officeDay,
  } = useAttendance();
  const [openKey, setOpenKey] = useState(null);
  const [letterKey, setLetterKey] = useState(null);
  // { [type]: { available, issued, reason } } — a letter tile is enabled
  // only after an admin / super admin has generated that letter.
  // Saved copy first so the tiles show the right state instantly.
  const [letterStatus, setLetterStatus] = useState(() => cacheGet(LETTERS_CACHE) || {});

  React.useEffect(() => {
    cacheLoad(LETTERS_CACHE).then((saved) => {
      if (saved) setLetterStatus((cur) => (Object.keys(cur).length ? cur : saved));
    });
  }, []);

  const loadLetters = useCallback(() => {
    getMyLetters()
      .then((map) => {
        setLetterStatus(map);
        cacheSet(LETTERS_CACHE, map, { persist: true });
      })
      .catch(() => {
        // keep the last known state
      });
  }, []);

  // Refresh whenever Home comes into focus, so a letter HR just generated
  // shows up enabled without restarting the app.
  useFocusEffect(
    useCallback(() => {
      loadLetters();
    }, [loadLetters]),
  );

  // Bumped on pull-to-refresh so the birthday / holiday card reloads too.
  const [celebrationKey, setCelebrationKey] = useState(0);
  const onRefresh = useCallback(() => {
    refresh();
    loadLetters();
    setCelebrationKey((k) => k + 1);
  }, [refresh, loadLetters]);

  // The page is drawn at once; only the attendance card waits for its data
  // (it used to block the whole Home screen with a spinner).
  const actions = useMemo(
    () =>
      QUICK_ACTIONS.filter((a) => {
        if (a.adminOnly && !(isAdmin && (a.allAdmins || canAccess(a.tabKey)))) return false;
        if (a.staffOnly && isAdmin) return false;
        if (a.hideIfLeft && hasLeft) return false;
        if (a.onlyIfLeft && !hasLeft) return false;
        return true;
      }),
    [isAdmin, canAccess, hasLeft],
  );

  const name = user?.name || "there";
  const attendDisabled = loading || actionLoading || (hasClockedIn && hasClockedOut);
  const open = actions.find((a) => a.key === openKey);
  const SheetContent = open?.sheet;

  const isLetterEnabled = (action) => Boolean(letterStatus[action.key]?.available);

  const onAction = (action) => {
    if (action.letter) {
      if (!isLetterEnabled(action)) {
        const st = letterStatus[action.key];
        Alert.alert(
          action.label,
          st?.issued
            ? st.reason || "This letter isn't available yet."
            : "This letter hasn't been generated by HR yet. It will be enabled once your admin generates it.",
        );
        return;
      }
      setLetterKey(action.key);
    }
    else if (action.tab) navigation.navigate(action.tab);
    else setOpenKey(action.key);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.headerFrom, colors.headerTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "relative",
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 20,
          }}
        >
          <CornerLogo size={64} loadFactor={0.4} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{user?.name}</Text>
              <View
                style={{
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.5)",
                  overflow: "hidden",
                }}
              >
                <Avatar name={user?.name} uri={myProfile?.photoUrl} size={44} self />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff", marginTop: 6 }}>
            Welcome back, {name.split(" ")[0]}! 👋
          </Text>
        </LinearGradient>

        {hasLeft ? (
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
            <SettlementCard staff={myProfile} onPreview={() => setOpenKey("Settlement")} />
          </View>
        ) : (
          <>
            {/* Today's attendance — not for the super admin (no attendance of
                their own to mark). */}
            {!isSuperAdmin ? (
            <View style={{ marginHorizontal: 16, marginTop: 8 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow.card }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Today&apos;s attendance</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {!isAdmin ? (
                      <AttendanceNotifications day={officeDay} presence={presence} attendance={attendance} />
                    ) : null}
                    <TouchableOpacity onPress={() => navigation.navigate("Activity")}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>View all ›</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {autoMode ? (
                  // Fully automatic: no buttons — in-time and going-time
                  // are marked when the phone reaches / leaves the office.
                  <>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <TimeBox label="In time" value={loading ? "…" : formatClock(officeDay.firstIn)} />
                      <TimeBox
                        label="Going time"
                        value={loading ? "…" : formatClock(officeDay.goingTime)}
                      />
                      <View
                        style={{
                          width: 92,
                          borderRadius: radius.md,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: colors.successSoft,
                        }}
                      >
                        <Text style={{ color: colors.success, fontWeight: "800", fontSize: 12 }}>⚡ AUTO</Text>
                        <Text style={{ color: colors.success, fontSize: 10, marginTop: 2 }}>
                          {officeDay.isOut ? "Out" : officeDay.firstIn ? "In office" : "Waiting"}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TimeBox label="Clock in" value={loading ? "…" : formatClock(attendance?.loginTime)} />
                  <TimeBox label="Clock out" value={loading ? "…" : formatClock(attendance?.logoutTime)} />
                  <TouchableOpacity
                    disabled={attendDisabled}
                    onPress={hasClockedIn ? clockOut : clockIn}
                    activeOpacity={0.85}
                    style={{
                      width: 92,
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hasClockedIn ? colors.danger : colors.primary,
                      opacity: attendDisabled ? 0.5 : 1,
                    }}
                  >
                    {actionLoading || loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                        {hasClockedIn ? (hasClockedOut ? "Done" : "Clock out") : "Clock in"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                )}

                {!isAdmin && !autoMode ? (
                  <TouchableOpacity onPress={enableAutoMode} activeOpacity={0.8} style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: "700", color: colors.primary }}>
                      ⚡ Allow Location &quot;All the time&quot; to mark attendance automatically (no Clock in / out) ›
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {error ? (
                  <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "500", color: colors.danger }}>{error}</Text>
                ) : null}
              </View>
            </View>
            ) : null}

            {/* Birthdays / holidays */}
            <View style={{ marginHorizontal: 16, marginTop: 16 }}>
              <BirthdayBanner user={user} refreshKey={celebrationKey} />
            </View>
          </>
        )}

        {/* Quick actions grid — 3 per row:
            Payroll · Leave · Advances
            Joining · Offer · Confirmation letter
            Termination · Leaving · Experience letter */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 24,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-start",
          }}
        >
          {actions.map((action) => {
            const disabled = action.letter && !isLetterEnabled(action);
            return (
            <TouchableOpacity
              key={action.key}
              style={{ width: "33.33%", alignItems: "center", marginBottom: 16, opacity: disabled ? 0.4 : 1 }}
              onPress={() => onAction(action)}
              activeOpacity={disabled ? 1 : 0.7}
              accessibilityState={{ disabled }}
            >
              <View
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: action.bg,
                  ...shadow.soft,
                }}
              >
                <Text style={{ fontSize: 18 }}>{action.emoji}</Text>
              </View>
              <Text style={{ marginTop: 4, textAlign: "center", fontSize: 11, color: "#4B5563" }}>
                {action.label}
              </Text>
              {disabled ? (
                <Text style={{ fontSize: 9, color: "#9CA3AF" }}>🔒 Not generated</Text>
              ) : null}
            </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <QuickActionSheet
        visible={!!SheetContent}
        title={open?.key === "Settlement" ? "Full & Final Settlement" : open?.label || ""} onClose={() => setOpenKey(null)}>
        {SheetContent ? <SheetContent /> : null}
      </QuickActionSheet>

      <QuickActionSheet
        visible={!!letterKey}
        title={LETTER_TYPES.find((l) => l.key === letterKey)?.label || ""}
        onClose={() => setLetterKey(null)}
      >
        {letterKey ? <LetterScreen type={letterKey} /> : null}
      </QuickActionSheet>
    </View>
  );
}

function TimeBox({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.track, borderRadius: radius.md, padding: 10 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
