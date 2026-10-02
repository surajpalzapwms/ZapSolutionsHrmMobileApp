// src/components/ModuleUI.jsx — small building blocks shared by every module screen.
import React from "react";
import { Text, View } from "react-native";
import { colors, radius, shadow } from "../theme/colors";

export function SectionTitle({ children, style }) {
  return (
    <Text style={[{ fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 12 }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          ...shadow.soft,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const TONES = {
  primary: { bg: colors.primarySoft, text: colors.primary },
  success: { bg: colors.successSoft, text: colors.success },
  danger: { bg: colors.dangerSoft, text: colors.danger },
  warning: { bg: "#FEF3E2", text: colors.warning },
  muted: { bg: colors.track, text: colors.textMuted },
};

// Maps any backend status string onto a badge colour.
export function toneForStatus(status = "") {
  const s = String(status).toLowerCase();
  if (["approved", "paid", "active", "present", "repaid"].includes(s)) return "success";
  if (["rejected", "cancelled", "inactive", "absent", "unpaid"].includes(s)) return "danger";
  if (["partial", "half", "half-day"].includes(s)) return "warning";
  if (!s) return "muted";
  return "primary";
}

export function Badge({ label, tone = "primary" }) {
  const c = TONES[tone] || TONES.primary;
  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 5,
              }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: c.text, textTransform: "capitalize" }}>
        {label}
      </Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function Row({ left, right, bold, rightColor }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
      <Text
        style={{
          fontSize: 13,
          color: bold ? colors.text : colors.textMuted,
          fontWeight: bold ? "700" : "400",
        }}
      >
        {left}
      </Text>
      <Text style={{ fontSize: 13, color: rightColor || colors.text, fontWeight: bold ? "700" : "600" }}>
        {right}
      </Text>
    </View>
  );
}

export function StatBox({ label, value, valueColor }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.track,
        borderRadius: radius.md,
        paddingVertical: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: valueColor || colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

export function EmojiIcon({ emoji, bg, size = 44 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

// One list item: emoji tile on the left, title/subtitle in the middle,
// optional right-hand content (badge, amount…).
export function ListItem({ emoji, emojiBg = colors.primarySoft, title, subtitle, meta, right }) {
  return (
    <Card style={{ marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
      {emoji ? <EmojiIcon emoji={emoji} bg={emojiBg} /> : null}
      <View style={{ flex: 1, marginLeft: emoji ? 12 : 0, marginRight: right ? 10 : 0 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
    </Card>
  );
}
