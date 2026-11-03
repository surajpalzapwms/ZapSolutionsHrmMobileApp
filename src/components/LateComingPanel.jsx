// src/components/LateComingPanel.jsx
// Mobile version of the website's LateComingPanel — "Late coming" card
// shown under the Month view of the attendance calendar.
//
// Rules (same as backend services/lateDeduction.js):
//   • first 15 minutes after shift start are a buffer — never deducted
//   • every minute after that is deducted at the per-minute salary
//   • minutes stayed after shift end the same day cancel late minutes
//     (late 20 min at 10:20, sign out 6:50 PM → nothing deducted)
//   • lunch (45 min): if lunch was NOT taken it counts as working time; if taken,
//     the unused part of the 45 min counts — only when a deduction exists
//   • SUPER ADMIN can turn the deduction off for the month, or waive
//     single dates. Everyone else only sees the figures.
import React, { useEffect, useState } from "react";
import { View, Text, Switch, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow } from "../theme/colors";
import { formatTime } from "../utils/format";
import { formatMoneyZero } from "../utils/format";

const money2 = (v) =>
  formatMoneyZero(v);

export const mins = (n) => {
  const v = Math.max(0, Math.round(Number(n) || 0));
  if (v < 60) return `${v}m`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const dayLabel = (key) => {
  const d = new Date(`${key}T00:00:00`);
  if (isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", weekday: "short" });
};

// Status of one late date → label + colour (also used for calendar dots).
export const lateState = (late, monthEnabled = true) => {
  if (!late) return null;
  if (late.pending) return { key: "pending", label: "Pending", color: colors.warning };
  if (late.fullyMadeUp) return { key: "madeup", label: "Made up", color: colors.success };
  if (late.waived) return { key: "waived", label: "Waived", color: "#9CA3AF" };
  if (!monthEnabled) return { key: "off", label: "Not deducted", color: "#9CA3AF" };
  return { key: "deducted", label: "Deducted", color: colors.danger };
};


// Lunch row for one late date (super admin edits, everyone else reads).
function LunchRow({ late, canEdit, busy, onChangeLunch }) {
  const [val, setVal] = useState(late.lunchTakenMinutes == null ? "" : String(late.lunchTakenMinutes));
  useEffect(() => {
    setVal(late.lunchTakenMinutes == null ? "" : String(late.lunchTakenMinutes));
  }, [late.lunchTakenMinutes, late.lunchSkipped]);

  const relevant =
    late.lunchEligible && !late.pending && (late.deductibleBeforeLunch > 0 || late.lunchCreditMinutes > 0);
  if (!relevant) return null;

  const credit =
    late.lunchCreditMinutes > 0 ? (
      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.success }}>
        +{mins(late.lunchCreditMinutes)} counted
      </Text>
    ) : null;

  if (!canEdit) {
    const label = late.lunchSkipped
      ? "Lunch not taken"
      : late.lunchTakenMinutes != null
        ? `Lunch ${mins(late.lunchTakenMinutes)}`
        : null;
    return label || credit ? (
      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
        {label}
        {label && credit ? " · " : ""}
        {late.lunchCreditMinutes > 0 ? `+${mins(late.lunchCreditMinutes)} counted` : ""}
      </Text>
    ) : null;
  }

  const save = () => {
    const raw = val.trim();
    if (raw === "") {
      if (late.lunchTakenMinutes != null) onChangeLunch?.(late.date, false, null);
      return;
    }
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0 || n > 480) {
      setVal(late.lunchTakenMinutes == null ? "" : String(late.lunchTakenMinutes));
      return;
    }
    if (n !== late.lunchTakenMinutes) onChangeLunch?.(late.date, false, n);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
      <Ionicons name="restaurant-outline" size={12} color={colors.textMuted} />
      <Text style={{ fontSize: 10, fontWeight: "600", color: colors.text }}>No lunch</Text>
      <Switch
        value={!!late.lunchSkipped}
        disabled={busy}
        onValueChange={(v) => onChangeLunch?.(late.date, v, null)}
        trackColor={{ true: colors.success, false: "#D1D5DB" }}
        thumbColor="#fff"
        style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
      />
      {!late.lunchSkipped ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>taken</Text>
          <TextInput
            value={val}
            editable={!busy}
            onChangeText={setVal}
            onBlur={save}
            onSubmitEditing={save}
            keyboardType="number-pad"
            placeholder={String(late.lunchAllowedMinutes || 45)}
            placeholderTextColor="#9CA3AF"
            style={{
              width: 44,
              paddingVertical: 2,
              paddingHorizontal: 4,
              fontSize: 11,
              textAlign: "right",
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
            }}
          />
          <Text style={{ fontSize: 10, color: colors.textMuted }}>min</Text>
        </View>
      ) : null}
      {credit}
    </View>
  );
}

export default function LateComingPanel({
  summary, // calendar payload `lateSummary`
  monthLabel,
  canEdit = false, // super admin only
  busy = false,
  onToggleMonth, // (deductLate: boolean) => void
  onToggleDay, // (date, waived: boolean) => void
  onChangeLunch, // (date, lunchSkipped: boolean, lunchTakenMinutes: number|null) => void
}) {
  if (!summary) return null;
  const { enabled, dates = [], bufferMinutes = 15, perMinuteRate = 0 } = summary;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        marginTop: 12,
        ...shadow.soft,
      }}
    >
      <View style={{ backgroundColor: "#FFF7E6", paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="alarm-outline" size={16} color={colors.warning} />
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text, flex: 1 }} numberOfLines={1}>
            Late coming — {monthLabel}
          </Text>
          {busy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          {bufferMinutes} min grace · {money2(perMinuteRate)}/min · time stayed after shift end is adjusted first
        </Text>
        {canEdit ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>
              Deduct from salary this month
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: enabled ? colors.danger : colors.textMuted }}>
                {enabled ? "ON" : "OFF"}
              </Text>
              <Switch
                value={!!enabled}
                disabled={busy}
                onValueChange={(v) => onToggleMonth?.(v)}
                trackColor={{ true: colors.danger, false: "#D1D5DB" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 11, fontWeight: "700", color: enabled ? colors.danger : colors.textMuted }}>
            {enabled ? "Deducted this month" : "Not deducted this month"}
          </Text>
        )}
      </View>

      {dates.length === 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 12 }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>No late coming this month.</Text>
        </View>
      ) : (
        dates.map((l, i) => {
          const st = lateState(l, enabled);
          const canToggle = canEdit && !l.pending && (l.deductibleMinutes > 0 || l.waived);
          return (
            <View
              key={l.date}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>
                  {dayLabel(l.date)}
                  <Text style={{ fontWeight: "500", color: colors.textMuted }}>
                    {"  "}
                    {formatTime(l.loginTime)} – {l.logoutTime ? formatTime(l.logoutTime) : "…"}
                  </Text>
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                  Late {mins(l.lateMinutes)}
                  {l.stayedLateMinutes > 0 ? ` · stayed ${mins(l.stayedLateMinutes)} extra` : ""}
                  {` · charged ${mins(l.deductibleMinutes)}`}
                </Text>
                <LunchRow late={l} canEdit={canEdit} busy={busy} onChangeLunch={onChangeLunch} />
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: l.deducted ? colors.danger : colors.textMuted,
                    textDecorationLine: !l.deducted && l.amount > 0 ? "line-through" : "none",
                  }}
                >
                  {l.amount > 0 ? money2(l.amount) : "—"}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "700", color: st.color }}>{st.label}</Text>
              </View>
              {canToggle ? (
                <TouchableOpacity
                  disabled={busy}
                  onPress={() => onToggleDay?.(l.date, !l.waived)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: l.waived ? colors.danger : colors.border,
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: l.waived ? colors.danger : colors.text }}>
                    {l.waived ? "Deduct" : "Don't deduct"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.track,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 2,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>Deducted from salary</Text>
          <Text style={{ fontSize: 13, fontWeight: "800", color: summary.totalDeduction > 0 ? colors.danger : colors.textMuted }}>
            {money2(summary.totalDeduction)}
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          {summary.lateDays} late day{summary.lateDays === 1 ? "" : "s"}
          {summary.madeUpDays ? ` · ${summary.madeUpDays} made up` : ""}
          {summary.waivedAmount > 0 ? ` · ${money2(summary.waivedAmount)} not deducted` : ""}
          {summary.pendingAmount > 0 ? ` · ${money2(summary.pendingAmount)} pending today` : ""}
        </Text>
        {dates.length > 0 ? (
          <Text style={{ fontSize: 10, color: colors.textMuted }}>
            Lunch: {summary.lunchSkippedDays || 0} not taken · {summary.lunchTakenDays || 0} taken
            {summary.totalLunchTakenMinutes > 0 ? ` (${mins(summary.totalLunchTakenMinutes)})` : ""}
            {` · ${mins(summary.totalLunchCreditMinutes || 0)} counted as work`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
