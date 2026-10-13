// src/components/OfficeDayTimeline.jsx — today's automatic attendance:
//
//   🟢 In            09:02 AM
//   🍱 Lunch break   01:05 PM – 01:45 PM   40 min   ✓ fine
//   🚶 Went out      04:10 PM – 04:30 PM   20 min
//   🔴 Going time    06:31 PM
//   In office 8h 49m · Lunch 40m · Out 20m
//
// Data comes from AttendanceContext.officeDay (presence/officeSession.js).
import React from "react";
import { Text, View } from "react-native";
import { colors, radius } from "../theme/colors";
import { formatClock } from "../utils/format";
import { lunchLabel } from "../presence/officeConfig";

export const durationLabel = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

function Row({ dot, label, time, right, rightColor, sub }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 }}>
      <Text style={{ fontSize: 13, width: 20, textAlign: "center" }}>{dot}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>{time}</Text>
      {right ? (
        <Text style={{ fontSize: 11, fontWeight: "700", color: rightColor || colors.textMuted, minWidth: 56, textAlign: "right" }}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}

export default function OfficeDayTimeline({ day, compact = false }) {
  if (!day || !day.firstIn) {
    return (
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
        Your in-time is marked automatically when you reach the office.
      </Text>
    );
  }

  const breaks = compact ? day.breaks.slice(-2) : day.breaks;
  const hidden = day.breaks.length - breaks.length;

  return (
    <View
      style={{
        marginTop: 12,
        backgroundColor: colors.track,
        borderRadius: radius.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Row dot="🟢" label="In" time={formatClock(day.firstIn)} />

      {hidden > 0 ? (
        <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 28, marginVertical: 2 }}>
          + {hidden} earlier break{hidden === 1 ? "" : "s"}
        </Text>
      ) : null}

      {breaks.map((b) =>
        b.open ? (
          <Row
            key={b.from}
            dot={b.lunch ? "🍱" : "🚶"}
            label={b.lunch ? "At lunch" : "Out of office"}
            sub={b.lunch ? "Lunch time — that's fine" : "Come back to continue, or this becomes your going time"}
            time={`since ${formatClock(b.from)}`}
            right={durationLabel(b.minutes)}
            rightColor={b.lunch ? colors.success : colors.warning}
          />
        ) : (
          <Row
            key={b.from}
            dot={b.lunch ? "🍱" : "🚶"}
            label={b.lunch ? "Lunch break" : "Went out"}
            sub={b.lunch ? "✓ Lunch time — fine" : undefined}
            time={`${formatClock(b.from)} – ${formatClock(b.to)}`}
            right={durationLabel(b.minutes)}
            rightColor={b.lunch ? colors.success : colors.warning}
          />
        ),
      )}

      {day.goingTime ? <Row dot="🔴" label="Going time" time={formatClock(day.goingTime)} /> : null}

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 5 }} />
      <Text style={{ fontSize: 11.5, color: colors.textMuted, paddingVertical: 2 }}>
        <Text style={{ fontWeight: "800", color: colors.text }}>In office {durationLabel(day.insideMinutes)}</Text>
        {day.lunchMinutes ? ` · Lunch ${durationLabel(day.lunchMinutes)}` : ""}
        {day.outMinutes ? ` · Out ${durationLabel(day.outMinutes)}` : ""}
      </Text>
      {!compact ? (
        <Text style={{ fontSize: 10.5, color: colors.textMuted, paddingBottom: 2 }}>Lunch time {lunchLabel()}</Text>
      ) : null}
    </View>
  );
}
