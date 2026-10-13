// src/components/DateField.jsx — tap to pick a date from a small month
// calendar (no native date-picker package needed). Value is "YYYY-MM-DD".
import React, { useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { colors, radius } from "../theme/colors";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n) => String(n).padStart(2, "0");
export const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (ymd) => {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  return y ? new Date(y, (m || 1) - 1, d || 1) : null;
};
export const prettyYMD = (ymd) => {
  const d = parse(ymd);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : "";
};

export default function DateField({ label, value, onChange, minDate, maxDate, placeholder = "Select date" }) {
  const [open, setOpen] = useState(false);
  const initial = parse(value) || parse(minDate) || new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out = Array(first.getDay()).fill(null);
    for (let d = 1; d <= daysIn; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return out;
  }, [cursor]);

  const disabled = (d) => (minDate && ymdOf(d) < minDate) || (maxDate && ymdOf(d) > maxDate);
  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <View>
      {label ? <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: 6 }}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: "#F9FAFB",
          borderRadius: radius.sm,
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 14, color: value ? colors.text : colors.textMuted }}>{value ? prettyYMD(value) : placeholder}</Text>
        <Text>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 }}
        >
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: "#fff", borderRadius: radius.lg, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <TouchableOpacity onPress={() => shift(-1)} hitSlop={10}>
                <Text style={{ fontSize: 20, color: colors.primary, fontWeight: "700" }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => shift(1)} hitSlop={10}>
                <Text style={{ fontSize: 20, color: colors.primary, fontWeight: "700" }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row" }}>
              {DAYS.map((d, i) => (
                <Text key={i} style={{ width: "14.28%", textAlign: "center", fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={{ width: "14.28%", height: 38 }} />;
                const key = ymdOf(d);
                const off = disabled(d);
                const sel = key === value;
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={off}
                    onPress={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    style={{ width: "14.28%", height: 38, alignItems: "center", justifyContent: "center" }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: sel ? colors.primary : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: sel ? "#fff" : off ? "#D1D5DB" : colors.text, fontWeight: sel ? "700" : "500" }}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
