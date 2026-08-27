import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../theme/colors";

// Build a smooth cubic-bezier path through points (Catmull-Rom -> Bezier).
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function WeeklyChart({
  data = [60, 30, 20, 55, 90, 70, 40],
  labels = ["W1", "W2", "W3", "W4"],
  markerIndex = 4,
  markerLabel = "08:01 AM",
  height = 180,
}) {
  const width = 320;
  const padY = 24;
  const max = Math.max(...data, 1);
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: padY + (1 - v / max) * (height - padY * 2),
  }));

  const line = smoothPath(points);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const marker = points[markerIndex];

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.16" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#fill)" />
        <Path d={line} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {marker && (
          <>
            <Circle cx={marker.x} cy={marker.y} r={6} fill={colors.text} />
            <Circle cx={marker.x} cy={marker.y} r={3} fill="#fff" />
          </>
        )}
      </Svg>

      {marker && (
        <View
          style={[
            styles.tooltip,
            { left: `${(marker.x / width) * 100}%`, top: (marker.y / height) * height - 30 },
          ]}
        >
          <Text style={styles.tooltipTxt}>{markerLabel}</Text>
        </View>
      )}

      <View style={styles.labels}>
        {labels.map((l) => (
          <Text key={l} style={styles.labelTxt}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    transform: [{ translateX: -32 }],
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tooltipTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  labelTxt: { fontSize: 12, color: colors.textMuted },
});
