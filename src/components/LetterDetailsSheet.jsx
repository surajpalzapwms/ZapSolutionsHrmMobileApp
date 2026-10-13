// src/components/LetterDetailsSheet.jsx — admin / super admin.
// Opens on "Generate" for an Offer / Joining / Confirmation letter. The
// server says which details the letter needs and which are still MISSING
// for this staff member — only those are asked (name, Mr. / Ms. from gender,
// designation, joining date, salary per probation month, Aadhaar, PAN…).
// Details already saved are filled in; "Show all details" lets HR correct
// them. Same form as the website (Staff → Letters).
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateField from "./DateField";
import { getLetterForm, issueLetter } from "../services/letterService";
import { colors, radius } from "../theme/colors";

const isBlank = (v) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.some((x) => x === "" || x === null || x === undefined));

const rowLabel = (i) => (i === 0 ? "Days 1 – 30/31" : `Days ${i === 1 ? "31/32" : i * 30 + 1} – ${(i + 1) * 30}`);

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === "ios" ? 11 : 8,
  fontSize: 14,
  color: colors.text,
  backgroundColor: colors.card,
};

function FieldInput({ field, value, onChange, probationMonths }) {
  const label = (
    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: 6 }}>
      {field.label}
      {field.required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );

  if (field.kind === "select") {
    return (
      <View>
        {label}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(field.options || []).map((o) => {
            const active = value === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                onPress={() => onChange(o.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  alignItems: "center",
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : colors.text }}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (field.kind === "date") {
    return <DateField label={`${field.label}${field.required ? " *" : ""}`} value={value || ""} onChange={onChange} />;
  }

  if (field.kind === "salaryRows") {
    const n = Math.max(1, Math.min(12, Number(probationMonths) || 3));
    const rows = Array.from({ length: n }, (_, i) => (Array.isArray(value) ? value[i] ?? "" : ""));
    return (
      <View>
        {label}
        {rows.map((v, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Text style={{ width: 110, fontSize: 12, color: colors.textMuted }}>{rowLabel(i)}</Text>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              keyboardType="numeric"
              value={v === "" ? "" : String(v)}
              placeholder="e.g. 20000"
              placeholderTextColor={colors.textMuted}
              onChangeText={(t) => {
                const next = [...rows];
                next[i] = t;
                onChange(next);
              }}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {label}
      <TextInput
        style={[inputStyle, field.kind === "textarea" ? { minHeight: 64, textAlignVertical: "top" } : null]}
        multiline={field.kind === "textarea"}
        keyboardType={field.kind === "number" ? "numeric" : "default"}
        autoCapitalize={field.key === "pan" ? "characters" : field.key === "email" ? "none" : "sentences"}
        value={value === null || value === undefined ? "" : String(value)}
        placeholder={field.placeholder}
        placeholderTextColor={colors.textMuted}
        onChangeText={onChange}
      />
    </View>
  );
}

/** Props: visible, onClose, staff ({ _id, staffName }), type, title, onGenerated(message) */
export default function LetterDetailsSheet({ visible, onClose, staff, type, title, onGenerated }) {
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !staff?._id || !type) return undefined;
    let cancelled = false;
    setLoading(true);
    setForm(null);
    getLetterForm(staff._id, type)
      .then((f) => {
        if (cancelled) return;
        setForm(f);
        setValues(Object.fromEntries((f?.fields || []).map((x) => [x.key, x.value])));
        setShowAll(!f?.missingCount);
      })
      .catch((e) => {
        if (cancelled) return;
        Alert.alert("Couldn't load", e.response?.data?.message || "Please try again.");
        onClose?.();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // onClose is left out on purpose: a new function each parent render
    // must not reload the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, staff?._id, type]);

  const fields = form?.fields || [];
  const shown = useMemo(() => (showAll ? fields : fields.filter((f) => f.missing)), [fields, showAll]);
  const filledCount = fields.length - fields.filter((f) => f.missing).length;
  const honor = values.gender === "Female" ? "Ms." : values.gender === "Male" ? "Mr." : "";
  const preview = [honor, values.staffName].filter(Boolean).join(" ");

  const submit = async () => {
    const missing = fields.filter((f) => f.required && isBlank(values[f.key]));
    if (missing.length) {
      Alert.alert("Missing details", `Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const res = await issueLetter(staff._id, type, values);
      onGenerated?.(res?.message || `${title} generated`);
      onClose?.();
    } catch (e) {
      Alert.alert("Couldn't generate", e.response?.data?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <View style={{ maxHeight: "92%", backgroundColor: colors.screen, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.text }}>{title} — details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 22, color: colors.textMuted }}>×</Text>
            </TouchableOpacity>
          </View>

          {loading || !form ? (
            <View style={{ padding: 40 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 13, color: form.missingCount ? colors.textMuted : colors.success, marginBottom: 10 }}>
                {form.missingCount
                  ? `${form.missingCount} detail${form.missingCount === 1 ? " is" : "s are"} missing. Details already saved for ${staff.staffName} are filled in automatically.`
                  : "All details are already saved — check them and generate."}
              </Text>
              {preview ? (
                <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: colors.primary }}>
                    Letter will say: <Text style={{ fontWeight: "800" }}>Dear {preview},</Text>
                  </Text>
                </View>
              ) : null}

              {shown.map((f) => (
                <View key={f.key} style={{ marginBottom: 14 }}>
                  <FieldInput
                    field={f}
                    value={values[f.key]}
                    probationMonths={values.probationMonths}
                    onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
                  />
                </View>
              ))}

              {filledCount > 0 ? (
                <TouchableOpacity onPress={() => setShowAll((s) => !s)} style={{ paddingVertical: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                    {showAll ? "Show only missing details" : `Show all details (${filledCount} already filled)`}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={submit}
                disabled={saving}
                activeOpacity={0.85}
                style={{ marginTop: 6, paddingVertical: 14, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>✨ Generate letter</Text>}
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 10 }}>
                Empty profile details entered here (gender, designation, department, address…) are also saved to the staff profile.
              </Text>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
