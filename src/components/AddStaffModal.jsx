// src/components/AddStaffModal.jsx — ADMIN: add a staff member (the app version of the website's
// "Add staff" form).
//   • first name, last name, contact number, e-mail and a password for their login are required
//     (same as the website); joining date, date of birth, gender, designation, department / team
//     and an own Staff ID are optional (no Staff ID = the server numbers it).
//   • CONTACT NUMBER starts with the COMPANY's country flag + code (PhoneField) — the admin can
//     tap the flag and pick any other country.
//   • Status / probation dates are worked out by the server (a company without Internship &
//     Probation confirms staff on their joining date).
// Not for the super admin inside a CLIENT company (view only): the list screen does not show
// the button there, and the API client / server refuse the call anyway.
import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateField, { ymdOf } from "./DateField";
import PhoneField from "./PhoneField";
import { staffService } from "../services/staffService";
import { isValidPhone } from "../utils/phone";
import { validateEmail, validatePassword } from "../utils/validation";
import { colors, radius } from "../theme/colors";

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14.5,
  color: colors.text,
};

function Field({ label, required, error, hint, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={{ fontSize: 11.5, color: colors.danger, marginTop: 5 }}>{error}</Text> : null}
      {!error && hint ? <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 5 }}>{hint}</Text> : null}
    </View>
  );
}

const GENDERS = [
  ["Male", "Male (Mr.)"],
  ["Female", "Female (Ms.)"],
];

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  contactNo: "",
  email: "",
  password: "",
  date: ymdOf(new Date()), // joining date: today
  dateOfBirth: "",
  gender: "",
  designation: "",
  department: "",
  staffId: "",
});

const validate = (f) => {
  const e = {};
  if (!f.firstName.trim()) e.firstName = "First name is required";
  if (!f.lastName.trim()) e.lastName = "Last name is required";
  if (!isValidPhone(f.contactNo)) e.contactNo = "Enter a valid phone number for the selected country";
  if (!validateEmail(f.email.trim())) e.email = "Enter a valid email";
  if (!validatePassword(f.password)) e.password = "Password must be at least 6 characters";
  return e;
};

export default function AddStaffModal({ visible, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const close = () => {
    if (saving) return;
    setForm(emptyForm());
    setErrors({});
    setShowPw(false);
    onClose?.();
  };

  const save = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      contactNo: form.contactNo, // "+<code> <number>" — same format the website saves
      email: form.email.trim(),
      password: form.password,
      date: form.date || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      designation: form.designation.trim(),
      department: form.department.trim(),
    };
    if (form.staffId.trim()) payload.staffId = form.staffId.trim();

    setSaving(true);
    try {
      const res = await staffService.create(payload);
      const created = res.data?.data || res.data || null;
      setForm(emptyForm());
      setErrors({});
      onSaved?.(created, res.data?.message);
    } catch (e) {
      // 409 = Staff ID / e-mail already exists, 4xx = plan limit or validation — the server explains.
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.[0]?.message ||
        (e?.response ? "Could not add the staff member." : "Check your connection and try again.");
      // A view-only refusal already showed its own alert (api.js).
      if (e?.response?.data?.code !== "CLIENT_COMPANY_READ_ONLY") Alert.alert("Could not add staff", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity onPress={close} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 16.5, fontWeight: "800", color: colors.text }}>Add staff</Text>
          <TouchableOpacity onPress={save} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ fontSize: 15, color: colors.primary, fontWeight: "800" }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}>
            <Field label="First name" required error={errors.firstName}>
              <TextInput value={form.firstName} onChangeText={set("firstName")} maxLength={60} autoCapitalize="words" placeholderTextColor={colors.textMuted} style={inputStyle} />
            </Field>
            <Field label="Last name" required error={errors.lastName}>
              <TextInput value={form.lastName} onChangeText={set("lastName")} maxLength={60} autoCapitalize="words" placeholderTextColor={colors.textMuted} style={inputStyle} />
            </Field>

            {/* Starts with the company's country flag + code; tap the flag to change it. */}
            <PhoneField label="Contact number" required value={form.contactNo} onChange={set("contactNo")} error={errors.contactNo} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Joining date">
                  <DateField value={form.date} onChange={set("date")} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date of birth">
                  <DateField value={form.dateOfBirth} onChange={set("dateOfBirth")} maxDate={ymdOf(new Date())} placeholder="Optional" />
                </Field>
              </View>
            </View>

            <Field label="Gender" hint="Used for Mr. / Ms. in letters">
              <View style={{ flexDirection: "row" }}>
                {GENDERS.map(([value, label]) => {
                  const on = form.gender === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      activeOpacity={0.85}
                      onPress={() => set("gender")(on ? "" : value)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: radius.pill,
                        marginRight: 8,
                        backgroundColor: on ? colors.primary : colors.card,
                        borderWidth: 1,
                        borderColor: on ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: on ? "#fff" : colors.text }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>

            <Field label="Designation (Job title)">
              <TextInput value={form.designation} onChangeText={set("designation")} maxLength={80} placeholder="e.g. Full Stack developer" placeholderTextColor={colors.textMuted} style={inputStyle} />
            </Field>
            <Field label="Department / Team">
              <TextInput value={form.department} onChangeText={set("department")} maxLength={80} placeholder="e.g. CRM & app development" placeholderTextColor={colors.textMuted} style={inputStyle} />
            </Field>

            <Field label="Staff ID" hint="Leave empty to number it automatically">
              <TextInput value={form.staffId} onChangeText={set("staffId")} maxLength={40} autoCapitalize="characters" autoCorrect={false} placeholderTextColor={colors.textMuted} style={inputStyle} />
            </Field>

            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary, letterSpacing: 0.6, marginBottom: 10, marginTop: 4 }}>LOGIN</Text>
            <Field label="Email" required error={errors.email}>
              <TextInput
                value={form.email}
                onChangeText={set("email")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            </Field>
            <Field label="Password" required error={errors.password} hint="At least 6 characters">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  value={form.password}
                  onChangeText={set("password")}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.textMuted}
                  style={[inputStyle, { flex: 1 }]}
                />
                <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={{ paddingHorizontal: 12 }} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>{showPw ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
