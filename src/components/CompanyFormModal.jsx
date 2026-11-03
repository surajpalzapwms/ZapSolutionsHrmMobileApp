// src/components/CompanyFormModal.jsx — SUPER ADMIN: add or edit a company.
// The app version of the website's "Add company" / "Edit" modal:
//   • name + country (country fills currency, time zone, weekly off days on the server)
//   • link name (login page: /login?company=<link name>)
//   • new company: optional one-time admin invite link, made right away
//   • edit: Active / Inactive
//   • advanced: tabs this company has, Internship & Probation, staff limit, own login domain,
//     office Wi-Fi addresses (owner company only)
// Same rule as the website: name + country are set when the company is CREATED. Afterwards they
// can only be edited for the owner company - a client company's own admin owns its details.
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { companyService } from "../services/companyService";
import { ALWAYS_ON_TABS, COMPANY_TABS, slugify } from "../config/companyTabs";
import { getCountry } from "../config/tenants";
import { colors, radius } from "../theme/colors";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

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

function Field({ label, hint, required, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 5 }}>{hint}</Text> : null}
    </View>
  );
}

function Check({ checked, disabled, onPress, label, sub }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: checked ? colors.primary : colors.border,
        backgroundColor: checked ? colors.primarySoft : colors.card,
        opacity: disabled ? 0.65 : 1,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.textMuted,
          backgroundColor: checked ? colors.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        {checked ? <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// value === null → the company has every tab (same meaning as the website).
function TabsPicker({ value, onChange }) {
  const all = value === null;
  const on = new Set(all ? COMPANY_TABS.map((t) => t.key) : value);
  const toggle = (key) => {
    const next = new Set(on);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    ALWAYS_ON_TABS.forEach((k) => next.add(k));
    const list = COMPANY_TABS.map((t) => t.key).filter((k) => next.has(k));
    onChange(list.length === COMPANY_TABS.length ? null : list);
  };
  return (
    <View>
      {COMPANY_TABS.map((t) => (
        <Check
          key={t.key}
          label={t.label}
          checked={on.has(t.key)}
          disabled={ALWAYS_ON_TABS.includes(t.key)}
          onPress={() => toggle(t.key)}
        />
      ))}
    </View>
  );
}

export default function CompanyFormModal({ visible, company, countries, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const editing = Boolean(company?._id);
  const isOwner = company?.isOwner === true;
  const lockDetails = editing && !isOwner; // client company: its admin edits the details

  const initial = useMemo(
    () => ({
      name: company?.name || "",
      slug: company?.slug || "",
      country: company?.country || "IN",
      isActive: company?.isActive !== false,
      enabledTabs: company ? company.enabledTabs ?? null : null,
      probationEnabled: company ? company.probationEnabled !== false : true,
      maxStaff: company?.maxStaff ? String(company.maxStaff) : "",
      customDomain: company?.customDomain || "",
      officeNetworksText: (company?.officeNetworks || []).join("\n"),
    }),
    [company],
  );

  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [withInvite, setWithInvite] = useState(!editing);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  // The parent mounts this modal only while it is open (key = company id / "new"),
  // so the state above always starts from `initial`.
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const preset = countries.find((c) => c.code === form.country);
  const presetHint = preset
    ? `${preset.currencyCode} · ${preset.timeZone} · weekly off ${(preset.weeklyOffDays || []).map((d) => DAY[d]).join(" + ")}`
    : "";

  const onName = (v) => setForm((f) => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));

  const save = async () => {
    const name = form.name.trim();
    if (!name) return Alert.alert("Company name is required");
    if (form.maxStaff.trim() !== "") {
      const n = Number(form.maxStaff);
      if (!Number.isInteger(n) || n < 1) return Alert.alert("Staff limit must be a whole number (or leave it empty)");
    }

    const body = {
      slug: form.slug || slugify(name),
      enabledTabs: form.enabledTabs,
      probationEnabled: form.probationEnabled,
      maxStaff: form.maxStaff.trim() === "" ? null : Number(form.maxStaff),
      customDomain: form.customDomain.trim(),
    };
    // Name / country / Wi-Fi: set when the company is created, editable afterwards only for
    // the owner company (the server refuses them for a client company anyway).
    if (!editing || isOwner) {
      body.name = name;
      body.country = form.country;
    }
    if (editing && isOwner) body.officeNetworks = form.officeNetworksText;
    // The owner company can never be switched off.
    if (editing && !isOwner) body.isActive = form.isActive;
    if (!editing && withInvite) body.inviteAdmin = true;

    setSaving(true);
    try {
      const res = editing ? await companyService.update(company._id, body) : await companyService.create(body);
      onSaved(res.data?.data, !editing, res.data?.invite || null, res.data?.message);
    } catch (e) {
      Alert.alert("Could not save the company", errMsg(e, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={saving ? undefined : onClose}>
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        {/* Header bar */}
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
          <TouchableOpacity onPress={onClose} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
          <Text
            style={{ flex: 1, textAlign: "center", fontSize: 16.5, fontWeight: "800", color: colors.text }}
            numberOfLines={1}
          >
            {editing ? `Edit ${company.name}` : "Add company"}
          </Text>
          <TouchableOpacity onPress={save} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ fontSize: 15, color: colors.primary, fontWeight: "800" }}>{editing ? "Save" : "Create"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
          >
            <Field label="Company name" required>
              <TextInput
                value={form.name}
                onChangeText={onName}
                editable={!lockDetails}
                maxLength={80}
                placeholder="e.g. Acme Traders"
                placeholderTextColor={colors.textMuted}
                style={[inputStyle, lockDetails ? { backgroundColor: "#F1F1F5", color: colors.textMuted } : null]}
              />
            </Field>

            <Field label="Country" required hint={lockDetails ? "Set when the company was created." : presetHint}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {countries.map((c) => {
                  const selected = form.country === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      activeOpacity={0.85}
                      disabled={lockDetails}
                      onPress={() => set("country")(c.code)}
                      style={{
                        opacity: lockDetails && !selected ? 0.4 : 1,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: radius.pill,
                        marginRight: 8,
                        marginBottom: 8,
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: selected ? "#fff" : colors.text }}>
                        {c.code === "OTHER" ? "🌐" : getCountry(c.code).flag} {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>

            <Field label="Link name" hint={`Login link: /login?company=${form.slug || "…"}`}>
              <TextInput
                value={form.slug}
                onChangeText={(v) => {
                  setSlugTouched(true);
                  set("slug")(slugify(v));
                }}
                maxLength={40}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            </Field>

            {editing && !isOwner ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  marginBottom: 16,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Active</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                    Staff and admins can log in
                  </Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={set("isActive")}
                  trackColor={{ true: colors.primary, false: "#D4D2E0" }}
                />
              </View>
            ) : editing ? null : (
              <View style={{ marginBottom: 16 }}>
                <Check
                  checked={withInvite}
                  onPress={() => setWithInvite((v) => !v)}
                  label="Make a one-time admin invite link"
                  sub="You get a link to send to anyone. They open it and create their own admin login. A company can have only one admin."
                />
              </View>
            )}

            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 17 }}>
              {isOwner
                ? "This is your own company — logo, address, registration numbers, signatory and stamp are on its Company Profile."
                : "You only create the company here. Its logo, address, registration numbers, staff and everything else are added by the company's own admin, using the invite link."}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAdvanced((v) => !v)}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.primary }}>
                {advanced ? "▾" : "▸"}  {isOwner ? "Plan, tabs, domain & office Wi-Fi" : "Plan, tabs & domain"}
              </Text>
            </TouchableOpacity>

            {advanced ? (
              <View>
                <Field label="Tabs this company has">
                  <TabsPicker value={form.enabledTabs} onChange={set("enabledTabs")} />
                  <Check
                    checked={form.probationEnabled}
                    onPress={() => set("probationEnabled")(!form.probationEnabled)}
                    label="Internship & Probation"
                    sub={
                      form.probationEnabled
                        ? "Unticked: no internship / probation — staff are confirmed on their joining date"
                        : "No internship or probation: every staff member is confirmed on the joining date. Staff now in Internship / Probation are confirmed when you save."
                    }
                  />
                </Field>

                <Field label="Staff limit" hint="Empty = unlimited">
                  <TextInput
                    value={form.maxStaff}
                    onChangeText={(v) => set("maxStaff")(v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textMuted}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Own login domain" hint="e.g. hr.company.com — point it at the website first">
                  <TextInput
                    value={form.customDomain}
                    onChangeText={set("customDomain")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholderTextColor={colors.textMuted}
                    style={inputStyle}
                  />
                </Field>

                {isOwner ? (
                <Field label="Office Wi-Fi addresses" hint="Public IP or range, one per line — used for automatic attendance">
                  <TextInput
                    value={form.officeNetworksText}
                    onChangeText={set("officeNetworksText")}
                    multiline
                    numberOfLines={3}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlignVertical="top"
                    placeholderTextColor={colors.textMuted}
                    style={[inputStyle, { minHeight: 84, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}
                  />
                </Field>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
