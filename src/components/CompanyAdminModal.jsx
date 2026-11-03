// src/components/CompanyAdminModal.jsx — SUPER ADMIN: the admin of one company.
// A company has exactly ONE admin. The super admin never types that person's password:
// they make a one-time invite link, the person opens it and creates their own login.
// A new link cancels the older unused one. The link is shown only right after it is made
// (the server keeps just a hash) — Share opens the phone's share sheet (Copy, WhatsApp, Mail…).
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { companyService } from "../services/companyService";
import { BACKEND_URL } from "../utils/constants";
import { colors, radius } from "../theme/colors";

// Where the invite page lives. The website is served from the same address as the API;
// set EXPO_PUBLIC_WEB_URL in .env if the website is on a different address.
const WEB_URL = String(process.env.EXPO_PUBLIC_WEB_URL || BACKEND_URL || "").replace(/\/+$/, "");
const inviteLinkFor = (token) => `${WEB_URL}/invite/${token}`;

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

const STATUS = {
  pending: { label: "Waiting to be used", bg: "#FEF3C7", fg: "#92400E" },
  used: { label: "Used", bg: colors.successSoft, fg: colors.success },
  expired: { label: "Expired", bg: "#ECECF1", fg: colors.textMuted },
  revoked: { label: "Cancelled", bg: "#ECECF1", fg: colors.textMuted },
};

const card = {
  backgroundColor: colors.card,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 14,
  marginBottom: 14,
};

const smallCaps = {
  fontSize: 11.5,
  fontWeight: "800",
  color: colors.textMuted,
  letterSpacing: 0.5,
  marginBottom: 6,
};

// A freshly made link: shown once, with Share.
export function InviteLinkCard({ token, expiresAt, companyName }) {
  const link = inviteLinkFor(token);
  const message = `You have been invited to create the admin account for ${companyName}. Open this one-time link and set your own name, e-mail and password:\n${link}`;

  const share = async () => {
    try {
      await Share.share(Platform.OS === "ios" ? { message, url: link } : { message });
    } catch {
      Alert.alert("Could not open the share sheet", "Long-press the link and copy it by hand.");
    }
  };

  return (
    <View style={{ ...card, backgroundColor: "#ECFDF3", borderColor: "#A7E3BE" }}>
      <Text style={{ fontSize: 14, fontWeight: "800", color: "#14532D" }}>Invite link ready — send it to the person</Text>
      <Text
        selectable
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: radius.sm,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#A7E3BE",
          fontSize: 12.5,
          color: colors.text,
        }}
      >
        {link}
      </Text>
      <TouchableOpacity
        onPress={share}
        activeOpacity={0.85}
        style={{ marginTop: 12, paddingVertical: 12, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.success }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14.5 }}>Share / copy link</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 11.5, color: "#166534", marginTop: 10, lineHeight: 16 }}>
        Works once{expiresAt ? ` and expires on ${fmtDate(expiresAt)}` : ""}. This link is shown only now — copy or share it
        before closing. If it is lost, make a new link (the old one stops working).
      </Text>
    </View>
  );
}

export default function CompanyAdminModal({ visible, company, onClose, onChanged, initialInvite = null }) {
  const insets = useSafeAreaInsets();
  const [admins, setAdmins] = useState(null);
  const [invites, setInvites] = useState([]);
  const [fresh, setFresh] = useState(initialInvite); // { token, expiresAt } shown once
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!company?._id) return;
    companyService
      .admins(company._id)
      .then((r) => setAdmins(r.data?.data || []))
      .catch(() => setAdmins([]));
    companyService
      .adminInvites(company._id)
      .then((r) => setInvites(r.data?.data || []))
      .catch(() => setInvites([]));
  }, [company?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const companyAdmin = (admins || []).find((a) => a.scope === "company");
  const branchAdmins = (admins || []).filter((a) => a.scope === "branch");

  const makeLink = async () => {
    const mail = email.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return Alert.alert("That e-mail address is not valid");
    setSaving(true);
    try {
      const res = await companyService.createAdminInvite(company._id, { email: mail || undefined, days });
      setFresh({ token: res.data.token, expiresAt: res.data.data?.expiresAt });
      setEmail("");
      load();
      onChanged?.();
    } catch (e) {
      Alert.alert("Could not create the invite link", errMsg(e, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const cancel = (inv) => {
    Alert.alert("Cancel this invite link?", "It will stop working straight away.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel link",
        style: "destructive",
        onPress: async () => {
          try {
            await companyService.cancelAdminInvite(company._id, inv._id);
            setFresh(null);
            load();
          } catch (e) {
            Alert.alert("Could not cancel the link", errMsg(e, "Please try again."));
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
          <Text style={{ flex: 1, fontSize: 16.5, fontWeight: "800", color: colors.text }} numberOfLines={1}>
            Admin — {company?.name}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 15, color: colors.primary, fontWeight: "800" }}>Done</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}>
            {/* Current admin */}
            {admins === null ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : companyAdmin ? (
              <View style={card}>
                <Text style={smallCaps}>COMPANY ADMIN</Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>
                  {companyAdmin.name || companyAdmin.firstName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{companyAdmin.email}</Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 6 }}>
                  {companyAdmin.lastLogin ? `Last login ${fmtDate(companyAdmin.lastLogin)}` : "Never logged in"}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 13.5, color: colors.textMuted, marginBottom: 14 }}>This company has no admin yet.</Text>
            )}

            {/* Make a link (only while there is no admin) */}
            {admins !== null && !companyAdmin ? (
              <View style={card}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Send an invite link</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 12, lineHeight: 17 }}>
                  Whoever opens the link creates the company's admin login themselves. It works once; a new link cancels the
                  older one.
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Lock to an e-mail (optional)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14.5,
                    color: colors.text,
                    backgroundColor: colors.screen,
                  }}
                />
                <Text style={{ ...smallCaps, marginTop: 14 }}>VALID FOR</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {[1, 3, 7, 14, 30].map((d) => {
                    const sel = days === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setDays(d)}
                        activeOpacity={0.85}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: radius.pill,
                          marginRight: 8,
                          marginBottom: 8,
                          backgroundColor: sel ? colors.primary : colors.screen,
                          borderWidth: 1,
                          borderColor: sel ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : colors.text }}>
                          {d} day{d > 1 ? "s" : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  onPress={makeLink}
                  disabled={saving}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 6,
                    paddingVertical: 13,
                    borderRadius: radius.md,
                    alignItems: "center",
                    backgroundColor: colors.primary,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14.5 }}>Generate invite link</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {fresh ? <InviteLinkCard token={fresh.token} expiresAt={fresh.expiresAt} companyName={company?.name} /> : null}

            {/* Recent links */}
            {invites.length > 0 ? (
              <View style={{ marginBottom: 14 }}>
                <Text style={smallCaps}>RECENT LINKS</Text>
                <View style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 0 }}>
                  {invites.map((inv, i) => {
                    const st = STATUS[inv.status] || STATUS.expired;
                    return (
                      <View
                        key={inv._id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 12,
                          borderTopWidth: i ? 1 : 0,
                          borderTopColor: colors.border,
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 13.5, color: colors.text }} numberOfLines={1}>
                            {inv.email || "Any e-mail"}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                            Created {fmtDate(inv.createdAt)} · expires {fmtDate(inv.expiresAt)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: st.bg }}>
                            <Text style={{ fontSize: 10.5, fontWeight: "800", color: st.fg }}>{st.label}</Text>
                          </View>
                          {inv.status === "pending" ? (
                            <TouchableOpacity onPress={() => cancel(inv)} style={{ marginTop: 6 }}>
                              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.danger }}>Cancel</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Branch admins (made by the company admin) */}
            {branchAdmins.length > 0 ? (
              <View>
                <Text style={smallCaps}>BRANCH ADMINS (MADE BY THE COMPANY ADMIN)</Text>
                <View style={{ ...card, padding: 0, overflow: "hidden" }}>
                  {branchAdmins.map((a, i) => (
                    <View key={a._id} style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.text }}>{a.name || a.firstName}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {a.email} · {a.branchName || "branch"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
