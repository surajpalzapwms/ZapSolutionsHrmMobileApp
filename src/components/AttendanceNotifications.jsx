// src/components/AttendanceNotifications.jsx
// 🔔 bell with a number. The automatic-attendance (office Wi-Fi) details —
// in time, lunch / out breaks, going time, Wi-Fi status — are NOT shown with
// the attendance any more; only the count is shown on the bell, and tapping
// it opens all the details.
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import QuickActionSheet from "./QuickActionSheet";
import OfficeDayTimeline from "./OfficeDayTimeline";
import { colors, radius, shadow } from "../theme/colors";
import { formatClock } from "../utils/format";

/** How many things happened today: in + each break + going time. */
export const notificationCount = (day) =>
  !day?.firstIn ? 0 : 1 + (day.breaks?.length || 0) + (day.goingTime ? 1 : 0);

export default function AttendanceNotifications({ day, presence, attendance, showStatus = true }) {
  const [open, setOpen] = useState(false);
  const count = notificationCount(day);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityLabel={`Attendance notifications, ${count}`}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.track,
        }}
      >
        <Text style={{ fontSize: 17 }}>🔔</Text>
        {count > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.danger,
              borderWidth: 1.5,
              borderColor: "#fff",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <QuickActionSheet visible={open} title="Attendance notifications" onClose={() => setOpen(false)}>
        {open ? (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, ...shadow.card }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Today</Text>
              {showStatus ? <AutoAttendanceLine presence={presence} attendance={attendance} /> : null}
              <OfficeDayTimeline day={day} />
            </View>
          </ScrollView>
        ) : null}
      </QuickActionSheet>
    </>
  );
}

// What automatic attendance is doing right now: on office Wi-Fi, out since
// HH:MM, signed out automatically, …
export function AutoAttendanceLine({ presence, attendance }) {
  let text = "Checking office Wi-Fi…";
  let color = "#6B7280";
  if (attendance?.autoSignedOut && attendance?.logoutTime) {
    text = `Going time marked automatically: ${formatClock(attendance.logoutTime)}`;
  } else if (presence?.action === "reopened") {
    text = "Back in the office — your day continues";
    color = "#047857";
  } else if (attendance?.lastDisconnectAt && !attendance?.logoutTime) {
    text = `Out of office since ${formatClock(attendance.lastDisconnectAt)} — come back to continue`;
    color = "#B45309";
  } else if (presence) {
    if (!presence.officeNetworkConfigured) {
      text = "Office not set up yet — ask your admin";
      color = "#B45309";
    } else if (presence.inOffice && presence.reason) {
      text = presence.reason; // e.g. "Cannot sign in on <holiday>"
      color = "#B45309";
    } else if (presence.inOffice) {
      text = presence.action === "signed_in" ? "Attendance marked automatically" : "At office — attendance is automatic";
      color = "#047857";
    } else if (presence.wifiReason === "no_location_permission" || presence.wifiReason === "location_off") {
      text =
        presence.wifiReason === "location_off"
          ? "Turn Location ON so the app can see the office Wi-Fi"
          : "Allow Location for this app so it can see the office Wi-Fi";
      color = "#B45309";
    } else {
      text = presence.wifiName ? `On "${presence.wifiName}" — not an office Wi-Fi` : "Not at office";
    }
  }
  return <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "600", color }}>📶 {text}</Text>;
}
