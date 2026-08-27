import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow } from "../theme/colors";
import StatCell from "../components/StatCell";
import WeeklyChart from "../components/WeeklyChart";
import * as attendanceApi from "../api/attendance";

const RANGES = ["1W", "1M", "1Y"];

export default function AnalyticsScreen() {
  const [range, setRange] = useState("1M");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    attendanceApi
      .getStaffSummary()
      .then((res) => setSummary(res))
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Analytics</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly accumulation */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Monthly Accumulation</Text>
            <TouchableOpacity style={styles.monthPill}>
              <Text style={styles.monthPillTxt}>September 2023</Text>
              <Ionicons name="chevron-down" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <StatCell label="Presence" value="23" divider />
            <StatCell label="Absence" value="0" divider />
            <StatCell label="Late" value="1.2h" valueColor={colors.warning} />
          </View>
        </View>

        {/* Attendance chart */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.rowCenter}>
              <Text style={styles.cardTitle}>Attendance</Text>
              <View style={styles.deltaPill}>
                <Ionicons name="trending-up" size={12} color={colors.success} />
                <Text style={styles.deltaTxt}>5.2%</Text>
              </View>
            </View>
            <View style={styles.rangeGroup}>
              {RANGES.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRange(r)}
                  style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                >
                  <Text
                    style={[
                      styles.rangeTxt,
                      range === r && styles.rangeTxtActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.percentRow}>
            <Text style={styles.percent}>97.5%</Text>
            <Text style={styles.lastMonth}>Last month : 92.5%</Text>
          </View>

          <WeeklyChart />
        </View>

        {/* KPI */}
        <Text style={styles.sectionLabel}>Key Performance Indicator</Text>
        <TouchableOpacity style={styles.downloadCard} activeOpacity={0.8}>
          <Text style={styles.downloadTxt}>September - Download</Text>
          <Ionicons name="download-outline" size={18} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Attendance Summary</Text>
        <View style={styles.card}>
          {(summary?.data || SAMPLE_SUMMARY).slice(0, 4).map((s, i, arr) => (
            <View key={s.name || i}>
              <View style={styles.sumRow}>
                <Text style={styles.sumName}>{s.name || s.staffName || "Staff"}</Text>
                <Text style={styles.sumVal}>
                  {s.presentDays ?? s.present ?? "—"} days
                </Text>
              </View>
              {i < arr.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SAMPLE_SUMMARY = [
  { name: "Mike Cooper", present: 23 },
  { name: "Brigette Whopper", present: 21 },
  { name: "Johnny Deep", present: 22 },
  { name: "Sarah Lee", present: 20 },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  topTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  monthPillTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row" },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  deltaTxt: { color: colors.success, fontSize: 11, fontWeight: "700" },
  rangeGroup: { flexDirection: "row", gap: 6 },
  rangeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeBtnActive: { backgroundColor: colors.primary },
  rangeTxt: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  rangeTxtActive: { color: "#fff" },
  percentRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 6 },
  percent: { fontSize: 26, fontWeight: "800", color: colors.primary },
  lastMonth: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
  },
  downloadCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 22,
    ...shadow.soft,
  },
  downloadTxt: { fontSize: 14, fontWeight: "600", color: colors.text },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  sumName: { fontSize: 14, color: colors.text, fontWeight: "500" },
  sumVal: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  rowDivider: { height: 1, backgroundColor: colors.border },
});
