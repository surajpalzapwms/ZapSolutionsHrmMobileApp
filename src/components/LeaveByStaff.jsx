// src/components/LeaveByStaff.jsx — admin / super admin: leave STAFF-WISE.
// Every staff member who has leave on record, with approved days split by
// type; tap a person to see each leave they took (date, type, status,
// reason). Uses the same records as the website's leave screens.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { attendanceService } from "../services/attendanceService";
import { unwrapList } from "../utils/helpers";
import { formatShortDate } from "../utils/format";
import { Badge, Card, Divider, toneForStatus } from "./ModuleUI";
import { BackLink, StaffRow, TotalsHeader, idOf, useBackHandler, useStaffMap } from "./StaffWise";
import { SearchBox } from "./StaffPicker";
import { colors } from "../theme/colors";

const LEAVE_LABEL = {
  paid: "Paid",
  unpaid: "Unpaid",
  swapleave: "Swap",
  sick: "Sick",
  casual: "Casual",
};

const days = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} day${n === 1 ? "" : "s"}`;
const yearOf = (l) => String(l.leaveDate || "").slice(0, 4);

export default function LeaveByStaff() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { map } = useStaffMap(true);
  const close = useCallback(() => setOpenId(null), []);
  useBackHandler(!!openId, close);

  useEffect(() => {
    let cancelled = false;
    attendanceService
      .getAllLeaveRequests({})
      .then((res) => !cancelled && setItems(unwrapList(res.data)))
      .catch((e) => !cancelled && setError(e.response?.data?.message || "Could not load leave."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => {
    const set = new Set(items.map(yearOf).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse().concat("All");
  }, [items]);

  const groups = useMemo(() => {
    const by = new Map();
    items
      .filter((l) => year === "All" || yearOf(l) === year)
      .forEach((l) => {
        const st = l.userId && typeof l.userId === "object" ? l.userId : null;
        const id = idOf(l.userId) || "unknown";
        if (!by.has(id)) {
          by.set(id, {
            id,
            name: st?.staffName || map[id]?.staffName || "Staff member",
            photoUrl: map[id]?.photoUrl || null,
            items: [],
            approved: 0,
            pending: 0,
            byType: {},
          });
        }
        const g = by.get(id);
        g.items.push(l);
        const v = Number(l.dayValue) || (l.isHalfDay ? 0.5 : 1);
        if (l.status === "approved") {
          g.approved += v;
          g.byType[l.leaveType] = (g.byType[l.leaveType] || 0) + v;
        } else if (l.status === "pending") g.pending += 1;
      });
    return [...by.values()]
      .map((g) => ({ ...g, items: g.items.sort((a, b) => String(b.leaveDate).localeCompare(String(a.leaveDate))) }))
      .sort((a, b) => b.approved - a.approved || a.name.localeCompare(b.name));
  }, [items, map, year]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, query]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />;
  if (error) return <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>;

  const breakdown = (byType) =>
    Object.entries(byType)
      .map(([t, n]) => `${LEAVE_LABEL[t] || t} ${Number.isInteger(n) ? n : n.toFixed(1)}`)
      .join(" · ");

  const open = groups.find((g) => g.id === openId);
  if (open) {
    return (
      <View>
        <BackLink label="All staff" onPress={close} />
        <TotalsHeader
          title={`${open.name} · ${year === "All" ? "all years" : year}`}
          items={[
            { label: "Leave taken", value: days(open.approved) },
            { label: "Pending requests", value: String(open.pending) },
            { label: "Records", value: String(open.items.length) },
          ]}
        />
        {Object.keys(open.byType).length ? (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>{breakdown(open.byType)}</Text>
        ) : null}
        <Card>
          {open.items.map((l, i) => (
            <View key={l._id || i}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                    {formatShortDate(l.leaveDate)}
                    {Number(l.dayValue) === 0.5 || l.isHalfDay ? " · half day" : ""}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {(LEAVE_LABEL[l.leaveType] || l.leaveType || "Leave") + " leave"}
                    {l.isAutoGenerated ? " · marked automatically (absent)" : ""}
                    {l.isSandwich ? " · sandwich" : ""}
                  </Text>
                  {l.reason ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                      {l.reason}
                    </Text>
                  ) : null}
                </View>
                <Badge label={l.status} tone={toneForStatus(l.status)} />
              </View>
              {i < open.items.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      </View>
    );
  }

  const totalDays = shown.reduce((s, g) => s + g.approved, 0);

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {years.map((y) => (
          <Badge key={y} label={y} tone={y === year ? "primary" : "muted"} onPress={() => setYear(y)} />
        ))}
      </View>
      <TotalsHeader
        title="Leave taken — staff-wise"
        items={[
          { label: "Approved leave", value: days(totalDays) },
          { label: "Staff", value: String(shown.length) },
        ]}
      />
      <SearchBox value={query} onChange={setQuery} style={{ marginHorizontal: 0, marginBottom: 10 }} />
      {shown.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.textMuted }}>No leave records.</Text>
      ) : (
        shown.map((g) => (
          <StaffRow
            key={g.id}
            name={g.name}
            photoUrl={g.photoUrl}
            subtitle={breakdown(g.byType) || "No approved leave"}
            meta={g.pending ? `${g.pending} pending request${g.pending === 1 ? "" : "s"}` : undefined}
            amount={days(g.approved)}
            onPress={() => setOpenId(g.id)}
          />
        ))
      )}
    </View>
  );
}
