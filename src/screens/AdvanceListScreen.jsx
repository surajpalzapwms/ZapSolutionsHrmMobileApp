// src/screens/AdvanceListScreen.jsx
//
//   • Staff login: ONLY their own advances (every advance they have ever
//     taken, newest first) — never anyone else's. The request asks the
//     server for this staff member only, and each record is checked again
//     on the phone, so another person's advance can never be shown.
//   • Admin: every staff member's advances, with the name.
//   • Super admin: STAFF-WISE — each staff member with how much advance
//     they were given (and still owe), the grand total on top; tap a
//     person for every advance they took.
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { BackLink, StaffRow, TotalsHeader, idOf as staffIdOf, useBackHandler, useStaffMap } from "../components/StaffWise";
import { advanceService } from "../services/advanceService";
import { useListLoader } from "../hooks/useListLoader";
import { useAuth } from "../contexts/AuthContext";
import ModuleList from "../components/ModuleList";
import { Badge, Card, ListItem, toneForStatus } from "../components/ModuleUI";
import { EmptyState, Loading } from "../components/ScreenStates";
import { colors } from "../theme/colors";
import { formatMoney, formatShortDate } from "../utils/format";

const sameId = (a, b) => a != null && b != null && a !== "" && String(a) === String(b);
const idOf = (v) => (v && typeof v === "object" ? v._id || v.id : v);
const dateOf = (item) => item.date || item.requestDate || item.createdAt;

// Does this advance record belong to the logged-in staff member?
function isMine(item, staffId, userId) {
  const emp = idOf(item.employeeId) ?? idOf(item.staffId) ?? idOf(item.staff);
  if (emp != null && emp !== "") return sameId(emp, staffId);
  // Older records without an employee link: fall back to the user account.
  const user = idOf(item.userId) ?? idOf(item.user) ?? idOf(item.createdFor);
  return sameId(user, userId);
}

const staffNameOf = (item) =>
  item.employeeName ||
  item.staffName ||
  item.staff?.name ||
  item.staff?.staffName ||
  (typeof item.employeeId === "object" && item.employeeId?.staffName) ||
  "Staff";

export default function AdvanceListScreen() {
  const { isAdmin, isSuperAdmin, myProfile, profileLoading, user } = useAuth();

  if (isSuperAdmin) return <AdvanceByStaff />;
  if (isAdmin) return <AdvanceList key="all" />;

  const staffId = myProfile?._id || null;
  if (!staffId) {
    if (profileLoading) return <Loading />;
    return <EmptyState emoji="💵" message="No staff profile is linked to your account — contact HR." />;
  }
  // Re-mounts (and reloads) if the linked staff profile changes.
  return <AdvanceList key={staffId} staffId={staffId} userId={user?.id} />;
}

function AdvanceList({ staffId = null, userId = null }) {
  const own = !!staffId;
  const loader = useListLoader(
    () => advanceService.getAll(own ? { employeeId: staffId } : undefined),
    "Could not load advances.",
  );

  // Own view: keep only this staff member's records. Newest first.
  const items = useMemo(() => {
    const list = own ? loader.items.filter((a) => isMine(a, staffId, userId)) : [...loader.items];
    return list.sort((a, b) => new Date(dateOf(b) || 0) - new Date(dateOf(a) || 0));
  }, [loader.items, own, staffId, userId]);

  // Own view: total taken (rejected requests not counted).
  const total = useMemo(
    () =>
      items
        .filter((a) => String(a.status || "").toLowerCase() !== "rejected")
        .reduce((s, a) => s + (Number(a.amount) || 0), 0),
    [items],
  );

  return (
    <ModuleList
      loader={{ ...loader, items }}
      emptyEmoji="💵"
      emptyMessage={own ? "You have not taken any advance." : "No advance requests found."}
      ListHeaderComponent={
        own && items.length ? (
          <Card style={{ marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>My advances</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                {items.length} record{items.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#EA580C" }}>{formatMoney(total)}</Text>
          </Card>
        ) : null
      }
      renderItem={({ item }) => {
        const date = dateOf(item);
        return (
          <ListItem
            emoji="💵"
            emojiBg="#FCE7F3"
            title={own ? (date ? formatShortDate(date) : "Advance") : staffNameOf(item)}
            subtitle={item.reason || undefined}
            meta={!own && date ? formatShortDate(date) : undefined}
            right={
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{formatMoney(item.amount)}</Text>
                {item.status ? <Badge label={item.status} tone={toneForStatus(item.status)} /> : null}
              </View>
            }
          />
        );
      }}
    />
  );
}
// ── Super admin: staff-wise ──────────────────────────────────────────────
const isRejected = (a) => String(a.status || "").toLowerCase() === "rejected";
const outstandingOf = (a) =>
  isRejected(a) || String(a.status || "").toLowerCase() === "repaid"
    ? 0
    : Math.max(0, (Number(a.amount) || 0) - (Number(a.repaidAmount) || 0));

function AdvanceByStaff() {
  const loader = useListLoader(() => advanceService.getAll(), "Could not load advances.");
  const { map } = useStaffMap(true);
  const [openId, setOpenId] = useState(null);
  const close = useCallback(() => setOpenId(null), []);
  useBackHandler(!!openId, close);

  const groups = useMemo(() => {
    const by = new Map();
    loader.items.forEach((a) => {
      const id = staffIdOf(a.employeeId) || staffNameOf(a);
      if (!by.has(id)) by.set(id, { id, name: staffNameOf(a), items: [], given: 0, outstanding: 0 });
      const g = by.get(id);
      g.items.push(a);
      if (!isRejected(a)) g.given += Number(a.amount) || 0;
      g.outstanding += outstandingOf(a);
    });
    const list = [...by.values()].map((g) => ({
      ...g,
      name: map[g.id]?.staffName || g.name,
      photoUrl: map[g.id]?.photoUrl || null,
      items: g.items.sort((a, b) => new Date(dateOf(b) || 0) - new Date(dateOf(a) || 0)),
    }));
    return list.sort((a, b) => b.given - a.given || a.name.localeCompare(b.name));
  }, [loader.items, map]);

  const totals = useMemo(
    () => ({
      given: groups.reduce((s, g) => s + g.given, 0),
      outstanding: groups.reduce((s, g) => s + g.outstanding, 0),
    }),
    [groups],
  );

  if (loader.loading) return <Loading />;
  const open = groups.find((g) => g.id === openId);

  if (open) {
    return (
      <FlatList
        style={{ flex: 1, backgroundColor: colors.screen }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        data={open.items}
        keyExtractor={(a, i) => a._id || String(i)}
        ListHeaderComponent={
          <>
            <BackLink label="All staff" onPress={close} />
            <TotalsHeader
              title={open.name}
              items={[
                { label: "Total given", value: formatMoney(open.given) },
                { label: "Still to recover", value: formatMoney(open.outstanding) },
                { label: "Advances", value: String(open.items.length) },
              ]}
            />
          </>
        }
        renderItem={({ item }) => (
          <ListItem
            emoji="💵"
            emojiBg="#FCE7F3"
            title={dateOf(item) ? formatShortDate(dateOf(item)) : "Advance"}
            subtitle={item.reason || undefined}
            meta={Number(item.repaidAmount) ? `Repaid ${formatMoney(item.repaidAmount)}` : undefined}
            right={
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{formatMoney(item.amount)}</Text>
                {item.status ? <Badge label={item.status} tone={toneForStatus(item.status)} /> : null}
              </View>
            }
          />
        )}
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={groups}
      keyExtractor={(g) => g.id}
      refreshControl={<RefreshControl refreshing={loader.refreshing} onRefresh={loader.refresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <TotalsHeader
          title="All advances given (rejected not counted)"
          items={[
            { label: "Total given", value: formatMoney(totals.given) },
            { label: "Still to recover", value: formatMoney(totals.outstanding) },
            { label: "Staff", value: String(groups.length) },
          ]}
        />
      }
      ListEmptyComponent={<EmptyState emoji="💵" message={loader.error || "No advances given yet."} />}
      renderItem={({ item: g }) => (
        <StaffRow
          name={g.name}
          photoUrl={g.photoUrl}
          subtitle={`${g.items.length} advance${g.items.length === 1 ? "" : "s"}`}
          meta={g.outstanding ? `To recover ${formatMoney(g.outstanding)}` : "Fully recovered"}
          amount={formatMoney(g.given)}
          amountColor="#EA580C"
          onPress={() => setOpenId(g.id)}
        />
      )}
    />
  );
}
