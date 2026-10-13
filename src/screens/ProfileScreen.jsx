// src/screens/ProfileScreen.jsx — same layout as the testing app's Profile.
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAuth } from "../contexts/AuthContext";
import { useAttendance } from "../contexts/AttendanceContext";
import { staffService } from "../services/staffService";
import { documentService } from "../services/documentService";
import Avatar from "../components/Avatar";
import { pickImage } from "../utils/filePick";
import { setMyLocalPhoto, usePhotoState } from "../utils/photoStore";
import ModuleSheetHeader from "../components/ModuleSheetHeader";
import { colors, radius, shadow } from "../theme/colors";
import { formatTime, totalHours, workedMinutes } from "../utils/format";

const TARGET_MINUTES = 8 * 60;

function formatBirthday(b) {
  if (!b) return "—";
  const d = new Date(b);
  if (isNaN(d.getTime())) return String(b);
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

export default function ProfileScreen() {
  const { user, logout, hasLeft, reloadMyProfile, myProfile } = useAuth();
  const { attendance, loading: attendanceLoading } = useAttendance();
  // Start from the profile already loaded at login (instant), then refresh.
  const [staff, setStaff] = useState(myProfile);
  const { myLocal } = usePhotoState();
  const [, setTick] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    staffService
      .getMyProfile()
      .then((res) => {
        if (!cancelled) setStaff(res.data?.data || res.data || null);
      })
      .catch(() => {
        // keep what we have (offline / server busy)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const photoUrl = staff?.photoUrl || null;
  const hasPhoto = !!(photoUrl || myLocal);

  const refreshStaff = async () => {
    const res = await staffService.getMyProfile();
    setStaff(res.data?.data || res.data || null);
    reloadMyProfile?.(); // Home header + cached profile pick up the new photo too
  };

  // Square crop → 512×512 JPEG → upload. Shown at once from the phone copy.
  const pickPhoto = async () => {
    try {
      const file = await pickImage({ camera: false, square: true });
      if (!file) return;
      setPhotoBusy(true);
      await documentService.uploadMine({ type: "photo", data: file.data, mimeType: file.mimeType, fileName: file.fileName });
      setMyLocalPhoto(file.dataUri);
      await refreshStaff();
    } catch (e) {
      Alert.alert("Upload failed", e?.response?.data?.message || e?.message || "Could not upload the photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () =>
    Alert.alert("Remove photo", "Remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setPhotoBusy(true);
            await documentService.deleteMine("photo");
            setMyLocalPhoto(null);
            await refreshStaff();
          } catch (e) {
            Alert.alert("Failed", e?.response?.data?.message || "Could not remove the photo.");
          } finally {
            setPhotoBusy(false);
          }
        },
      },
    ]);

  const live = !!attendance?.loginTime && !attendance?.logoutTime;

  // Keep the ring moving while a shift is in progress.
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [live]);

  const worked = workedMinutes(attendance?.loginTime, attendance?.logoutTime, live);
  const pct = Math.min(1, worked / TARGET_MINUTES);
  const displayName = staff?.staffName || user?.name || "—";

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ModuleSheetHeader
        title="Profile"
        right={
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
            {displayName}
          </Text>
        }
      />

      <ScrollView
        style={{ paddingHorizontal: 20, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Today's working ring — hidden once the staff member has left */}
        {hasLeft ? (
          <View style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Relieved</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                Last working day {formatBirthday(staff?.relievingDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={logout} activeOpacity={0.85} style={styles.logoutPill}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Log out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { alignItems: "center", paddingVertical: 22, paddingBottom: 60 }]}>
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, marginBottom: 16 }}
            >
              TODAY
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
              <Stat label="Check in" value={formatTime(attendance?.loginTime)} />
              {attendanceLoading ? (
                <ActivityIndicator color={colors.primary} style={{ height: 130, width: 130 }} />
              ) : (
                <Ring
                  pct={pct}
                  pctLabel={`${Math.round(pct * 100)}%`}
                  workedLabel={totalHours(attendance?.loginTime, attendance?.logoutTime, live)}
                  live={live}
                />
              )}
              <Stat label="Check out" value={formatTime(attendance?.logoutTime)} />
            </View>

            <TouchableOpacity
              onPress={logout}
              activeOpacity={0.85}
              style={[styles.logoutPill, { position: "absolute", right: 12, bottom: 12 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Log out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile photo */}
        <View style={[styles.card, { marginBottom: 12, alignItems: "center", paddingVertical: 20 }]}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} disabled={photoBusy}>
            <Avatar name={displayName} uri={photoUrl} size={96} self />
            {photoBusy ? (
              <View style={styles.photoBusy}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
            <TouchableOpacity onPress={pickPhoto} disabled={photoBusy}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                {hasPhoto ? "Change photo" : "Add photo"}
              </Text>
            </TouchableOpacity>
            {hasPhoto ? (
              <TouchableOpacity onPress={removePhoto} disabled={photoBusy}>
                <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 13 }}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, { marginTop: 12, paddingHorizontal: 18 }]}>
          <Row label="Full name" value={displayName} />
          <Row label="Email" value={user?.email || "—"} />
          {staff?.staffId ? <Row label="Staff ID" value={staff.staffId} /> : null}
          <Row label="Birthday" value={formatBirthday(staff?.dateOfBirth)} />
          <Row label="Designation" value={staff?.projectName || staff?.designation || "—"} />
          {staff?.date ? (
            <Row label="Joining date" value={formatBirthday(staff.date)} />
          ) : null}
          {hasLeft ? <Row label="Relieving date" value={formatBirthday(staff?.relievingDate)} /> : null}
          <Row
            label="Role"
            value={(user?.role || "").replace("-", " ") || "—"}
            capitalize
            last
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last, capitalize }) {
  return (
    <View style={[styles.row, { borderBottomWidth: last ? 0 : 1 }]}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <Text
        style={[styles.value, capitalize && { textTransform: "capitalize" }, { flexShrink: 1, marginLeft: 12 }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Ring({ pct, pctLabel, workedLabel, live }) {
  const size = 130;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </Svg>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{pctLabel}</Text>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 2 }}>{workedLabel}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{live ? "Working…" : "Total hours"}</Text>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ alignItems: "center", width: 84 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomColor: colors.border,
  },
  value: { fontSize: 13, fontWeight: "600", color: colors.text },
  photoBusy: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
});
