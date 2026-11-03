import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, FlatList, RefreshControl, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ErrorState, Loading, EmptyState } from "../components/ScreenStates";
import Avatar from "../components/Avatar";
import { Badge, Card } from "../components/ModuleUI";
import DocumentsPanel from "../components/DocumentsPanel";
import ReferralCard from "../components/ReferralCard";
import AddStaffModal from "../components/AddStaffModal";
import ViewOnlyBanner from "../components/ViewOnlyBanner";
import { SettlementStatement } from "../components/Settlement";
import AttendanceCalendar, { clearAttendanceCache } from "../components/AttendanceCalendar";
import { SearchBox, clearStaffCache, filterStaff, staffKeyOf, staffNameOf, useAllStaff } from "../components/StaffPicker";
import { hasLeftOrganization } from "../utils/staffStatus";
import { staffService } from "../services/staffService";
import { resetCelebrationCache } from "../services/celebrationService";
import { clearAppCaches } from "../utils/appCache";
import { formatMoney, formatShortDate } from "../utils/format";
import { colors, radius } from "../theme/colors";

// Admin and super-admin both see every staff member here — including staff who
// were DISABLED (they are hidden everywhere else in the app). Super admin (and an
// admin with the Staff tab) can switch a person Enabled / Disabled from here.
// The company's ADMIN adds staff (＋ Add staff). The super admin can do it only in their
// own (owner) company; inside a client company the screen is VIEW ONLY.
export default function StaffListScreen() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <ErrorState message="You don't have access to this section." />;
  }
  return <StaffListContent />;
}

// Employment status (separate from the Enabled / Disabled switch).
const statusOf = (s) => {
  if (hasLeftOrganization(s)) return { label: "Left", tone: "warning" };
  if (s.status === "Relieved") return { label: "Notice period", tone: "warning" };
  return { label: "Active", tone: "success" };
};

const isDisabled = (s) => s?.enabled === false;

// Enable / Disable with a confirmation. After it works every cached list on the
// phone is dropped so the person disappears from (or returns to) every screen.
function useAccessToggle({ patch, onChanged }) {
  const [busyId, setBusyId] = useState(null);

  const run = useCallback(
    async (member, next) => {
      const id = staffKeyOf(member);
      patch(id, { enabled: next });
      onChanged?.(id, next);
      setBusyId(id);
      try {
        await staffService.toggleStatus(id, next);
        clearStaffCache();
        clearAttendanceCache();
        clearAppCaches();
        resetCelebrationCache();
      } catch (e) {
        patch(id, { enabled: !next });
        onChanged?.(id, !next);
        Alert.alert("Could not update", e?.response?.data?.message || "Please check your connection and try again.");
      } finally {
        setBusyId(null);
      }
    },
    [patch, onChanged],
  );

  const ask = useCallback(
    (member, next) => {
      const name = staffNameOf(member);
      Alert.alert(
        next ? `Enable ${name}?` : `Disable ${name}?`,
        next
          ? `${name} will be able to log in again and will show in every list, dropdown and report.`
          : `${name} will be signed out and cannot log in. Their data is hidden everywhere in the app and website except this Staff tab.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: next ? "Enable" : "Disable", style: next ? "default" : "destructive", onPress: () => run(member, next) },
        ],
      );
    },
    [run],
  );

  return { busyId, ask };
}

// Switch + "Enabled / Disabled" label.
function AccessSwitch({ member, canManage, busy, onAsk }) {
  const off = isDisabled(member);
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: off ? colors.danger : colors.success }}>
        {off ? "Disabled" : "Enabled"}
      </Text>
      {canManage ? (
        <Switch
          value={!off}
          disabled={busy}
          onValueChange={(v) => onAsk(member, v)}
          trackColor={{ false: "#D1D5DB", true: colors.success }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }], marginTop: 2 }}
        />
      ) : null}
    </View>
  );
}

const FILTERS = [
  ["all", "All"],
  ["enabled", "Enabled"],
  ["disabled", "Disabled"],
];

function StaffListContent() {
  const { canAccess, isViewOnly } = useAuth();
  const canManage = canAccess("staff") && !isViewOnly;
  const canAdd = canAccess("staff.add"); // false for view-only (AuthContext)
  const [addOpen, setAddOpen] = useState(false);
  // includeDisabled: this is the only screen that lists disabled staff.
  const { staff, loading, error, reload, patch } = useAllStaff(true, { includeDisabled: true });
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const onChanged = useCallback(
    (id, enabled) => setSelected((cur) => (cur && staffKeyOf(cur) === id ? { ...cur, enabled } : cur)),
    [],
  );
  const { busyId, ask } = useAccessToggle({ patch, onChanged });
  const disabledCount = useMemo(() => staff.filter(isDisabled).length, [staff]);
  const list = useMemo(() => {
    const found = filterStaff(staff, query);
    if (filter === "enabled") return found.filter((s) => !isDisabled(s));
    if (filter === "disabled") return found.filter(isDisabled);
    return found;
  }, [staff, query, filter]);

  // Android back button closes the details first.
  useEffect(() => {
    if (!selected) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  };

  // A new staff member: every cached list on the phone is dropped, then the list is reloaded.
  const onAdded = async (created) => {
    setAddOpen(false);
    clearStaffCache();
    clearAttendanceCache();
    clearAppCaches();
    resetCelebrationCache();
    await reload(true);
    const nm = created?.staffName || created?.data?.staffName;
    Alert.alert("Staff added", nm ? `${nm} can now log in with the email and password you set.` : "The staff member can now log in with the email and password you set.");
  };

  if (selected) {
    return (
      <StaffDetails
        staff={selected}
        onBack={() => setSelected(null)}
        canManage={canManage}
        busy={busyId === staffKeyOf(selected)}
        onAsk={ask}
        viewOnly={isViewOnly}
      />
    );
  }
  if (loading && !staff.length) return <Loading />;
  if (error && !staff.length) return <ErrorState message={error} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <ViewOnlyBanner />
      {canAdd ? (
        <TouchableOpacity
          onPress={() => setAddOpen(true)}
          activeOpacity={0.85}
          style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>＋  Add staff</Text>
        </TouchableOpacity>
      ) : null}
      <SearchBox value={query} onChange={setQuery} style={{ marginTop: 12 }} />
      <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 10 }}>
        {FILTERS.map(([key, label]) => {
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => setFilter(key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : colors.text }}>
                {label}
                {key === "disabled" ? ` (${disabledCount})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginHorizontal: 16, marginTop: 8 }}>
        {list.length} of {staff.length} staff · tap anyone for full details
      </Text>
      <FlatList
        style={{ flex: 1 }}
        data={list}
        keyExtractor={(s, i) => staffKeyOf(s) || String(i)}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState emoji="👥" message="No staff members found." />}
        initialNumToRender={12}
        renderItem={({ item }) => {
          const name = staffNameOf(item);
          const st = statusOf(item);
          return (
            <TouchableOpacity activeOpacity={0.75} onPress={() => setSelected(item)}>
              <Card
                style={{
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: isDisabled(item) ? 0.7 : 1,
                }}
              >
                <Avatar name={name} uri={item.photoUrl} size={44} />
                <View style={{ flex: 1, marginLeft: 12, marginRight: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {[item.staffId, item.designation || item.projectName || item.role].filter(Boolean).join(" · ")}
                  </Text>
                  {item.email ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                      {item.email}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Badge label={st.label} tone={st.tone} />
                  <AccessSwitch member={item} canManage={canManage} busy={busyId === staffKeyOf(item)} onAsk={ask} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
      {canAdd ? <AddStaffModal visible={addOpen} onClose={() => setAddOpen(false)} onSaved={onAdded} /> : null}
    </View>
  );
}

// ── Full details of one staff member ─────────────────────────────────────

// Known fields first, in this order, with friendly labels.
const KNOWN_FIELDS = [
  ["staffName", "Full name"],
  ["staffId", "Staff ID"],
  ["email", "Email"],
  ["contactNo", "Phone"],
  ["phone", "Phone"],
  ["mobile", "Mobile"],
  ["phoneNumber", "Phone"],
  ["designation", "Designation"],
  ["projectName", "Project / Designation"],
  ["team", "Team"],
  ["department", "Department"],
  ["role", "Role"],
  ["gender", "Gender"],
  ["dateOfBirth", "Date of birth"],
  ["date", "Joining date"],
  ["confirmationDate", "Confirmation date"],
  ["status", "Status"],
  ["relievingDate", "Relieving date"],
  ["salary", "Salary"],
  ["basicSalary", "Basic salary"],
  ["address", "Address"],
];
// Internal / noisy keys that are never shown.
const HIDDEN = new Set([
  "_id", "id", "__v", "password", "passwordEncrypted", "userId", "user", "createdBy", "updatedBy",
  "avatar", "photo", "image", "photoUrl", "photoUpdatedAt", "issuedLetters", "enabled",
]);
const MONEY_KEY = /salary|amount|ctc|pay$/i;
const DATE_KEY = /date|dob|At$/i;

const prettyKey = (k) =>
  String(k)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return MONEY_KEY.test(key) ? formatMoney(value) : String(value);
  if (typeof value === "string") {
    if (DATE_KEY.test(key) && !isNaN(new Date(value).getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatShortDate(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => (v && typeof v === "object" ? v.name || v.title || v.label || null : v))
      .filter((v) => v !== null && v !== undefined && v !== "");
    return parts.length ? parts.join(", ") : null;
  }
  return null; // objects are flattened by the caller
}

// Every field of the record → [label, value] rows (nested objects one level deep).
function detailRows(staff) {
  const rows = [];
  const seen = new Set();
  const seenLabels = new Set();
  const push = (key, label, value) => {
    const v = formatValue(key, value);
    if (v === null || seenLabels.has(`${label}|${v}`)) return;
    seenLabels.add(`${label}|${v}`);
    rows.push([label, v]);
  };
  KNOWN_FIELDS.forEach(([k, label]) => {
    if (k in staff) {
      seen.add(k);
      if (staff[k] && typeof staff[k] === "object" && !Array.isArray(staff[k])) {
        const o = staff[k];
        push(k, label, o.name || o.title || [o.line1, o.street, o.city, o.state, o.pincode].filter(Boolean).join(", "));
      } else {
        push(k, label, staff[k]);
      }
    }
  });
  Object.keys(staff).forEach((k) => {
    if (seen.has(k) || HIDDEN.has(k)) return;
    const v = staff[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.keys(v).forEach((sub) => {
        if (HIDDEN.has(sub)) return;
        if (v[sub] && typeof v[sub] === "object" && !Array.isArray(v[sub])) return;
        push(sub, `${prettyKey(k)} · ${prettyKey(sub)}`, v[sub]);
      });
    } else {
      push(k, prettyKey(k), v);
    }
  });
  return rows;
}

function StaffDetails({ staff, onBack, canManage, busy, onAsk, viewOnly = false }) {
  const name = staffNameOf(staff);
  const st = statusOf(staff);
  const rows = useMemo(() => detailRows(staff), [staff]);
  const [refreshing, setRefreshing] = useState(false);
  const [calKey, setCalKey] = useState(0);
  // Full & Final Settlement (same statement the staff member sees) — only
  // once the staff member has actually left.
  const left = hasLeftOrganization(staff);
  const [showSettlement, setShowSettlement] = useState(false);

  // Android back closes the settlement first (registered last = runs first).
  useEffect(() => {
    if (!showSettlement) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowSettlement(false);
      return true;
    });
    return () => sub.remove();
  }, [showSettlement]);

  if (showSettlement) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        <TouchableOpacity
          onPress={() => setShowSettlement(false)}
          hitSlop={8}
          style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, alignSelf: "flex-start" }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>‹ {name}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, paddingHorizontal: 16 }}>
          Full &amp; Final Settlement
        </Text>
        <SettlementStatement staff={{ ...staff, _id: staff._id || staffKeyOf(staff) }} />
      </View>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    clearAttendanceCache();
    setCalKey((k) => k + 1);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <TouchableOpacity onPress={onBack} hitSlop={8} style={{ marginBottom: 12, alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>‹ All staff</Text>
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar name={name} uri={staff.photoUrl} size={52} bg="rgba(255,255,255,0.2)" color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {[staff.staffId, staff.designation || staff.projectName].filter(Boolean).join(" · ") || "—"}
            </Text>
          </View>
          <Badge label={st.label} tone={st.tone} />
        </View>

        <Card style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
              {isDisabled(staff) ? "Disabled" : "Enabled"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              {isDisabled(staff)
                ? "Cannot log in. Shown only in this Staff tab — hidden from every other list."
                : "Can log in and shows in every list and dropdown."}
            </Text>
          </View>
          {canManage ? (
            <Switch
              value={!isDisabled(staff)}
              disabled={busy}
              onValueChange={(v) => onAsk(staff, v)}
              trackColor={{ false: "#D1D5DB", true: colors.success }}
              thumbColor="#fff"
            />
          ) : null}
        </Card>

        <Card style={{ marginTop: 12, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginVertical: 4 }}>
            ALL DETAILS
          </Text>
          {rows.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textMuted, paddingVertical: 6 }}>No details recorded.</Text>
          ) : (
            rows.map(([label, value], i) => (
              <View
                key={`${label}-${i}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 7,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textMuted, flexShrink: 0, maxWidth: "45%" }}>{label}</Text>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: "600", flex: 1, textAlign: "right" }}>
                  {value}
                </Text>
              </View>
            ))
          )}
        </Card>

        {left ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Full &amp; Final Settlement</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Relieved on {formatShortDate(staff.relievingDate) || "—"} · month-wise salary, deductions and balance payable
            </Text>
            <TouchableOpacity
              onPress={() => setShowSettlement(true)}
              activeOpacity={0.85}
              style={{ marginTop: 10, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>View Final Settlement</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        <ReferralCard staff={staff} />

        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginTop: 16, marginBottom: 8 }}>
          DOCUMENTS
        </Text>
        <DocumentsPanel staffId={staffKeyOf(staff)} staffName={name} editable={!viewOnly} onChanged={(t) => t === "photo" && clearStaffCache()} />

        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginTop: 16 }}>
          ATTENDANCE &amp; SALARY
        </Text>
      </View>

      <AttendanceCalendar key={`${staffKeyOf(staff)}-${calKey}`} staffId={staffKeyOf(staff)} staff={staff} />
    </ScrollView>
  );
}
