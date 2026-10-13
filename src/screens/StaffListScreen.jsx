import React, { useEffect, useMemo, useState } from "react";
import { BackHandler, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ErrorState, Loading, EmptyState } from "../components/ScreenStates";
import Avatar from "../components/Avatar";
import { Badge, Card } from "../components/ModuleUI";
import DocumentsPanel from "../components/DocumentsPanel";
import AttendanceCalendar, { clearAttendanceCache } from "../components/AttendanceCalendar";
import { SearchBox, clearStaffCache, filterStaff, staffKeyOf, staffNameOf, useAllStaff } from "../components/StaffPicker";
import { hasLeftOrganization } from "../utils/staffStatus";
import { formatMoney, formatShortDate } from "../utils/format";
import { colors, radius } from "../theme/colors";

// Admin and super-admin both see every staff member here.
export default function StaffListScreen() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <ErrorState message="You don't have access to this section." />;
  }
  return <StaffListContent />;
}

const statusOf = (s) => {
  if (hasLeftOrganization(s)) return { label: "Left", tone: "warning" };
  if (s.status === "Relieved") return { label: "Notice period", tone: "warning" };
  const active = s.isActive ?? (s.status ? String(s.status).toLowerCase() !== "inactive" : true);
  return active ? { label: "Active", tone: "success" } : { label: "Inactive", tone: "danger" };
};

function StaffListContent() {
  const { staff, loading, error, reload } = useAllStaff();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const list = useMemo(() => filterStaff(staff, query), [staff, query]);

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

  if (selected) return <StaffDetails staff={selected} onBack={() => setSelected(null)} />;
  if (loading && !staff.length) return <Loading />;
  if (error && !staff.length) return <ErrorState message={error} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <SearchBox value={query} onChange={setQuery} style={{ marginTop: 12 }} />
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
              <Card style={{ marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
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
                <Badge label={st.label} tone={st.tone} />
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Full details of one staff member ─────────────────────────────────────

// Known fields first, in this order, with friendly labels.
const KNOWN_FIELDS = [
  ["staffName", "Full name"],
  ["staffId", "Staff ID"],
  ["email", "Email"],
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
  "avatar", "photo", "image", "photoUrl", "photoUpdatedAt", "issuedLetters",
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

function StaffDetails({ staff, onBack }) {
  const name = staffNameOf(staff);
  const st = statusOf(staff);
  const rows = useMemo(() => detailRows(staff), [staff]);
  const [refreshing, setRefreshing] = useState(false);
  const [calKey, setCalKey] = useState(0);

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

        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginTop: 16, marginBottom: 8 }}>
          DOCUMENTS
        </Text>
        <DocumentsPanel staffId={staffKeyOf(staff)} staffName={name} onChanged={(t) => t === "photo" && clearStaffCache()} />

        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginTop: 16 }}>
          ATTENDANCE &amp; SALARY
        </Text>
      </View>

      <AttendanceCalendar key={`${staffKeyOf(staff)}-${calKey}`} staffId={staffKeyOf(staff)} staff={staff} />
    </ScrollView>
  );
}
