// src/components/StaffPicker.jsx
// Admin / super-admin: choose which staff member's details to view.
//
//   useAllStaff()   — every Staff record (cached for the session).
//   <StaffPicker /> — a button showing the selected person; tapping it opens
//                     a searchable list of ALL staff (current + relieved).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { staffService } from "../services/staffService";
import { unwrapList } from "../utils/helpers";
import { hasLeftOrganization } from "../utils/staffStatus";
import Avatar from "./Avatar";
import { colors, radius } from "../theme/colors";

export const staffNameOf = (s) => s?.staffName || s?.name || "Staff";
export const staffKeyOf = (s) => (s ? String(s._id || s.id || "") : "");

// Two cached lists:
//   visible — what every screen uses. Staff an admin DISABLED are not in it.
//   all     — the Staff tab only: everyone, so a disabled person can be enabled again.
let staffPromise = null;
let allStaffPromise = null;
export function clearStaffCache() {
  staffPromise = null;
  allStaffPromise = null;
}

const sortStaff = (list) =>
  list.sort((a, b) => {
    // Current staff first, then A–Z.
    const la = hasLeftOrganization(a) ? 1 : 0;
    const lb = hasLeftOrganization(b) ? 1 : 0;
    if (la !== lb) return la - lb;
    return staffNameOf(a).localeCompare(staffNameOf(b));
  });

function loadAllStaff() {
  if (!staffPromise) {
    staffPromise = staffService
      .getAll()
      // The server already leaves disabled staff out; this is a second safety
      // net so a disabled person never shows in a list or dropdown.
      .then((res) => sortStaff(unwrapList(res.data).filter((s) => s?.enabled !== false)))
      .catch((e) => {
        staffPromise = null;
        throw e;
      });
  }
  return staffPromise;
}

function loadStaffIncludingDisabled() {
  if (!allStaffPromise) {
    allStaffPromise = staffService
      .getAllIncludingHidden()
      .then((res) => sortStaff(unwrapList(res.data)))
      .catch((e) => {
        allStaffPromise = null;
        throw e;
      });
  }
  return allStaffPromise;
}

// useAllStaff(enabled, { includeDisabled })
//   includeDisabled: true is ONLY for the Staff tab.
export function useAllStaff(enabled = true, { includeDisabled = false } = {}) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(
    (fresh = false) => {
      if (!enabled) return Promise.resolve();
      if (fresh) clearStaffCache();
      setLoading(true);
      setError("");
      return (includeDisabled ? loadStaffIncludingDisabled() : loadAllStaff())
        .then(setStaff)
        .catch((e) => setError(e?.response?.data?.message || "Could not load staff."))
        .finally(() => setLoading(false));
    },
    [enabled, includeDisabled],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Lets a screen change one person in the list right away (Enable / Disable).
  const patch = useCallback((id, changes) => {
    const apply = (list) => list.map((s) => (String(s._id || s.id) === String(id) ? { ...s, ...changes } : s));
    setStaff(apply);
  }, []);

  return { staff, loading, error, reload: load, patch };
}

export function filterStaff(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((s) =>
    [staffNameOf(s), s.staffId, s.email, s.designation, s.projectName, s.phone, s.mobile]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)),
  );
}

export default function StaffPicker({ staff, selected, onSelect, extraOption, title = "VIEWING STAFF" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useMemo(() => filterStaff(staff, query), [staff, query]);

  const label = selected ? staffNameOf(selected) : extraOption?.label || "Select staff";
  const sub = selected
    ? [selected.staffId, selected.designation || selected.projectName].filter(Boolean).join(" · ")
    : extraOption?.sub || "";

  const choose = (s) => {
    onSelect(s);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Avatar name={label} uri={selected?.photoUrl} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
            {label}
          </Text>
          {sub ? (
            <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }} edges={["top", "bottom"]}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 10 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: colors.text }}>Select staff</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <SearchBox value={query} onChange={setQuery} />
          <FlatList
            data={list}
            keyExtractor={(s, i) => staffKeyOf(s) || String(i)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40 }}
            ListHeaderComponent={
              extraOption && !query ? (
                <PickRow
                  name={extraOption.label}
                  sub={extraOption.sub}
                  active={!selected}
                  onPress={() => choose(null)}
                />
              ) : null
            }
            ListEmptyComponent={
              <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 30 }}>No staff found.</Text>
            }
            renderItem={({ item }) => (
              <PickRow
                name={staffNameOf(item)}
                photo={item.photoUrl}
                sub={[item.staffId, item.designation || item.projectName].filter(Boolean).join(" · ")}
                left={hasLeftOrganization(item)}
                active={staffKeyOf(item) === staffKeyOf(selected)}
                onPress={() => choose(item)}
              />
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

export function SearchBox({ value, onChange, style }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginHorizontal: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={16} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search name, ID, email…"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text }}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChange("")} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PickRow({ name, photo, sub, active, left, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: active ? colors.primarySoft : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        borderRadius: radius.md,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Avatar name={name} uri={photo} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
          {name}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {left ? <Text style={{ fontSize: 10, fontWeight: "700", color: colors.warning }}>LEFT</Text> : null}
      {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
    </TouchableOpacity>
  );
}
