// src/components/ReferralCard.jsx
// Referral organisation + first-month commission for one staff member.
//   • Super admin: set / change / remove (organisation, %, month).
//   • Admin: read-only.
// Example: Navkar, 25% → 20,000 × 25% = ₹5,000.00 taken from the first
// month salary. The figure comes from the same backend calculation the
// website and payroll use.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card } from "./ModuleUI";
import { useAuth } from "../contexts/AuthContext";
import { staffService } from "../services/staffService";
import { payrollService } from "../services/payrollService";
import { colors, radius } from "../theme/colors";
import { SHORT_MONTHS } from "../utils/constants";
import { formatMoneyZero } from "../utils/format";
import { utcOffsetMs } from "../utils/tenant";

const PURPLE = "#7E22CE";
const money2 = (v) =>
  formatMoneyZero(v);
const istPeriodOf = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const t = new Date(d.getTime() + utcOffsetMs());
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
};
const periodLabel = (p) => {
  if (!p) return "—";
  const [y, m] = p.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1] || m} ${y}`;
};

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 14,
  color: colors.text,
  backgroundColor: "#fff",
  marginTop: 4,
};

export default function ReferralCard({ staff }) {
  const { isSuperAdmin: superAdmin, isViewOnly } = useAuth();
  // Super admin may set / change / remove — except inside a client company (view only).
  const isSuperAdmin = superAdmin && !isViewOnly;
  const staffId = staff?._id || staff?.id;
  const defaultPeriod = istPeriodOf(staff?.date);
  const [referral, setReferral] = useState(staff?.referral || null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ organizationName: "", commissionPercent: "", commissionPeriod: "" });
  const [preview, setPreview] = useState(null);

  // The staff list may not carry the referral — read the full record once.
  useEffect(() => {
    if (!staffId) return undefined;
    let cancelled = false;
    staffService
      .getById(staffId)
      .then((res) => {
        if (!cancelled) setReferral(res.data?.data?.referral || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  const active = !!referral?.organizationName && Number(referral?.commissionPercent) > 0;
  // Commission is taken from the FIRST (joining) month only.
  const period = active ? defaultPeriod : "";

  const loadPreview = useCallback(() => {
    if (!staffId || !period) {
      setPreview(null);
      return;
    }
    payrollService
      .calculate(staffId, period)
      .then((r) => setPreview(r.data?.data || r.data || null))
      .catch(() => setPreview(null));
  }, [staffId, period]);
  useEffect(loadPreview, [loadPreview]);

  const startEdit = () => {
    setForm({
      organizationName: referral?.organizationName || "",
      commissionPercent: referral?.commissionPercent ? String(referral.commissionPercent) : "",
      commissionPeriod: "",
    });
    setEditing(true);
  };

  const save = async () => {
    const pct = Number(form.commissionPercent);
    const org = form.organizationName.trim();
    if (!org) return Alert.alert("Referral", "Enter the organisation name.");
    if (!(pct > 0 && pct <= 100)) return Alert.alert("Referral", "Commission % must be between 0 and 100.");
    setSaving(true);
    try {
      const commissionPeriod = ""; // first (joining) month only
      const res = await staffService.setReferral(staffId, {
        organizationName: org,
        commissionPercent: Math.round(pct * 100) / 100,
        commissionPeriod,
      });
      setReferral({ organizationName: org, commissionPercent: Math.round(pct * 100) / 100, commissionPeriod });
      setEditing(false);
      Alert.alert("Referral saved", res.data?.message || "Saved.");
    } catch (err) {
      Alert.alert(
        "Referral",
        err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Could not save the referral.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert("Remove referral?", "The commission will no longer be taken from the first month salary.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await staffService.clearReferral(staffId);
            setReferral(null);
            setPreview(null);
          } catch (err) {
            Alert.alert("Referral", err.response?.data?.message || "Could not remove the referral.");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);

  if (!active && !isSuperAdmin) return null;

  return (
    <Card style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6 }}>
          REFERRAL ORGANISATION
        </Text>
        {isSuperAdmin && !editing ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity onPress={startEdit} disabled={saving} hitSlop={8}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>{active ? "Edit" : "Set"}</Text>
            </TouchableOpacity>
            {active ? (
              <TouchableOpacity onPress={remove} disabled={saving} hitSlop={8}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.danger }}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {editing ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Organisation name</Text>
          <TextInput
            value={form.organizationName}
            onChangeText={(v) => setForm((f) => ({ ...f, organizationName: v }))}
            placeholder="e.g. Navkar"
            maxLength={120}
            style={inputStyle}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Commission %</Text>
              <TextInput
                value={form.commissionPercent}
                onChangeText={(v) => setForm((f) => ({ ...f, commissionPercent: v.replace(/[^0-9.]/g, "") }))}
                placeholder="25"
                keyboardType="decimal-pad"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Taken from</Text>
              <Text style={[inputStyle, { color: colors.text }]}>First month only</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Only from the first month salary ({periodLabel(defaultPeriod)}) — never any other month
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 10 }}>
            <TouchableOpacity onPress={() => setEditing(false)} disabled={saving}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : active ? (
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: PURPLE }}>{referral.organizationName}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {Number(referral.commissionPercent).toFixed(2)}% of the first month salary · {periodLabel(period)}
          </Text>
          {preview ? (
            <View style={{ marginTop: 6, gap: 2 }}>
              <Text style={{ fontSize: 12, color: colors.text }}>
                Basic {money2(preview.basicSalary)} × {Number(referral.commissionPercent).toFixed(2)}% ={" "}
                <Text style={{ fontWeight: "700", color: PURPLE }}>
                  {money2(preview.referralCommissionFull ?? preview.referralCommission)}
                </Text>
              </Text>
              {Number(preview.leaveDeduction) > 0 ? (
                <Text style={{ fontSize: 12, color: colors.text }}>
                  Leave deduction ({preview.unpaidLeaveDays} day{preview.unpaidLeaveDays === 1 ? "" : "s"} ×{" "}
                  {money2(preview.perDaySalary)}): {money2(preview.leaveDeduction)}
                </Text>
              ) : null}
              {Number(preview.lateDeduction) > 0 ? (
                <Text style={{ fontSize: 12, color: colors.text }}>Late coming: {money2(preview.lateDeduction)}</Text>
              ) : null}
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                Salary payable for {periodLabel(period)}: {money2(preview.netSalary)}
              </Text>
              {preview.referralCommissionCapped ? (
                <Text style={{ fontSize: 11, color: colors.warning }}>
                  Commission limited to {money2(preview.referralCommission)} (salary earned so far)
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>No referral organisation</Text>
      )}
    </Card>
  );
}
