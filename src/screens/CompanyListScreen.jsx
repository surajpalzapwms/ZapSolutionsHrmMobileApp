// src/screens/CompanyListScreen.jsx — SUPER ADMIN only, shown right after login.
// The app version of the website's "Your client companies" page: every company as a
// card (logo, country, staff / admins / profile %), tap one → THAT company's dashboard
// (AuthContext.selectCompany sets the tenant, then RootNavigator shows MainTabs).
// "Change company" on Home / Profile comes back here.
// Also like the website: ADD a company, EDIT it, activate / deactivate, delete an empty one,
// and make the one-time ADMIN invite link (CompanyFormModal / CompanyAdminModal).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useListLoader } from "../hooks/useListLoader";
import { companyService } from "../services/companyService";
import { fileUrl } from "../utils/api";
import { getCountry } from "../config/tenants";
import Avatar from "../components/Avatar";
import CompanyFormModal from "../components/CompanyFormModal";
import CompanyAdminModal from "../components/CompanyAdminModal";
import { FALLBACK_COUNTRIES } from "../config/companyTabs";
import { EmptyState, ErrorState, Loading } from "../components/ScreenStates";
import { colors, radius, shadow } from "../theme/colors";

// ── helpers ────────────────────────────────────────────────────────────────
const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || "").trim());
const brandOf = (c) => (isHex(c?.primaryColor) ? String(c.primaryColor).trim() : colors.primary);

// White or dark text, whichever is readable on the company colour.
function onColor(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.72 ? "#1E1B2E" : "#FFFFFF";
}

const nameOf = (c) => String(c?.name || "Company").trim();
const isActive = (c) => c?.isActive !== false;
const pct = (c) => Math.max(0, Math.min(100, Number(c?.profileComplete) || 0));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// Soft fade + slide-up when a card appears.
function FadeInUp({ index = 0, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay: Math.min(index, 8) * 70, useNativeDriver: true }).start();
  }, [v, index]);
  return (
    <Animated.View
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

// Company logo, or a coloured badge with the first letter (same as the website).
function CompanyBadge({ company, size = 56 }) {
  const [failed, setFailed] = useState(false);
  const brand = brandOf(company);
  if (company?.logoUrl && !failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: fileUrl(company.logoUrl) }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={{ width: size - 12, height: size - 12 }}
        />
      </View>
    );
  }
  const letter = String(company?.shortName || company?.name || "?").trim().charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: brand,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.44, fontWeight: "800", color: onColor(brand) }}>{letter}</Text>
    </View>
  );
}

function StatTile({ value, label }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.screen, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function ActionBtn({ label, onPress, tone = "default" }) {
  const danger = tone === "danger";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        paddingVertical: 9,
        marginHorizontal: 3,
        borderRadius: radius.sm,
        alignItems: "center",
        backgroundColor: danger ? colors.dangerSoft : colors.screen,
        borderWidth: 1,
        borderColor: danger ? colors.dangerSoft : colors.border,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: "800", color: danger ? colors.danger : colors.text }} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CompanyCard({ company, last, onOpen, onEdit, onAdmin, onToggle, onDelete }) {
  const brand = brandOf(company);
  const active = isActive(company);
  const country = getCountry(company?.country);
  const countryName = company?.countryName || (country.code ? country.name : "");
  const progress = pct(company);
  const staffLabel = company?.maxStaff ? `Staff / ${company.maxStaff}` : "Staff";
  const isOwner = company?.isOwner === true;
  // Only an empty CLIENT company can be deleted; the owner company never can (same as the website).
  const canDelete = !isOwner && num(company?.staffCount) === 0 && num(company?.adminCount) === 0;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        marginBottom: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: last ? brand : colors.border,
        opacity: active ? 1 : 0.8,
        ...shadow.card,
      }}
    >
      {/* Company colour strip */}
      <View style={{ height: 5, backgroundColor: brand }} />

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <CompanyBadge company={company} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }} numberOfLines={1}>
              {nameOf(company)}
            </Text>
            <Text style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 3 }} numberOfLines={1}>
              {country.flag} {countryName}
              {company?.currencyCode ? `  ·  ${company.currencyCode}` : ""}
            </Text>
            {company?.slug ? (
              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                /login?company={company.slug}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.successSoft : "#ECECF1",
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: "800", color: active ? colors.success : colors.textMuted }}>
                {active ? "ACTIVE" : "INACTIVE"}
              </Text>
            </View>
            {isOwner ? (
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "#DBEAFE" }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#1D4ED8" }}>YOUR COMPANY</Text>
              </View>
            ) : null}
            {last ? (
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: colors.primary }}>LAST OPENED</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Staff / Admins / Profile % — same three numbers as the website */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <StatTile value={num(company?.staffCount)} label={staffLabel} />
          <StatTile value={num(company?.adminCount)} label="Admins" />
          <StatTile value={`${progress}%`} label="Profile" />
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: "hidden", marginTop: 10 }}>
          <View style={{ width: `${progress}%`, height: "100%", borderRadius: 3, backgroundColor: brand }} />
        </View>

        {/* Open */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onOpen(company)}
          style={{
            marginTop: 14,
            paddingVertical: 12,
            borderRadius: radius.md,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            backgroundColor: active ? brand : "#ECECF1",
          }}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "800", color: active ? onColor(brand) : colors.textMuted }}>
            {active ? (isOwner ? "Open dashboard" : "View dashboard") : "Inactive company"}
          </Text>
          {active ? <Text style={{ fontSize: 18, marginLeft: 8, color: onColor(brand) }}>→</Text> : null}
        </TouchableOpacity>

        {/* Manage — same actions as the website's company card */}
        <View style={{ flexDirection: "row", marginTop: 10, marginHorizontal: -3 }}>
          <ActionBtn label="Edit" onPress={() => onEdit(company)} />
          <ActionBtn label="Admin" onPress={() => onAdmin(company)} />
          {isOwner ? null : <ActionBtn label={active ? "Deactivate" : "Activate"} onPress={() => onToggle(company)} />}
          {canDelete ? <ActionBtn label="Delete" tone="danger" onPress={() => onDelete(company)} /> : null}
        </View>
      </View>
    </View>
  );
}

function Chip({ label, count, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        marginRight: 8,
        backgroundColor: selected ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: selected ? "#fff" : colors.text }}>
        {label} <Text style={{ opacity: 0.7 }}>({count})</Text>
      </Text>
    </TouchableOpacity>
  );
}

function HeaderStat({ value, label }) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.md, paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 1 }}>{label}</Text>
    </View>
  );
}

// ── screen ─────────────────────────────────────────────────────────────────
export default function CompanyListScreen() {
  const { user, myPhotoUrl, selectCompany, logout, lastCompanyId, companyNotice } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const { items, loading, refreshing, error, refresh, reload } = useListLoader(
    companyService.list,
    "Could not load the companies.",
    "companies",
  );

  // Add / edit / admin-invite modals (super admin only — this whole screen is).
  const [formFor, setFormFor] = useState(null); // null = closed, {} = new company, company = edit
  const [adminFor, setAdminFor] = useState(null); // { company, invite? }
  // Countries the SERVER supports (IN / SA / QA / Other) — not the app's 250-country table.
  const [serverCountries, setServerCountries] = useState(FALLBACK_COUNTRIES);
  useEffect(() => {
    let live = true;
    companyService
      .countries()
      .then((r) => {
        const list = r.data?.data;
        if (live && Array.isArray(list) && list.length) setServerCountries(list);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(() => items.filter((c) => c && c._id), [items]);

  // Header numbers
  const totals = useMemo(
    () => ({
      companies: rows.length,
      staff: rows.reduce((t, c) => t + num(c.staffCount), 0),
      active: rows.filter(isActive).length,
    }),
    [rows],
  );

  // Country chips (only when there is more than one country)
  const countries = useMemo(() => {
    const by = new Map();
    rows.forEach((c) => by.set(c.country, (by.get(c.country) || 0) + 1));
    return [...by.entries()].map(([code, count]) => ({
      code,
      count,
      label: `${getCountry(code).flag} ${rows.find((c) => c.country === code)?.countryName || getCountry(code).name}`,
    }));
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (c) =>
        (!countryFilter || c.country === countryFilter) &&
        (!q || `${nameOf(c)} ${c.slug || ""}`.toLowerCase().includes(q)),
    );
  }, [rows, query, countryFilter]);

  const open = (company) => {
    if (!isActive(company)) {
      Alert.alert(`${nameOf(company)} is inactive`, "Tap Activate on the company card first, then open it.");
      return;
    }
    selectCompany(company);
  };

  const errText = (e, fallback) => e?.response?.data?.message || fallback;

  const toggleActive = useCallback(
    (c) => {
      const on = isActive(c);
      Alert.alert(
        on ? `Deactivate ${nameOf(c)}?` : `Activate ${nameOf(c)}?`,
        on
          ? "Its staff and admins will not be able to log in until it is activated again."
          : "Its staff and admins can log in again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: on ? "Deactivate" : "Activate",
            style: on ? "destructive" : "default",
            onPress: async () => {
              try {
                await companyService.update(c._id, { isActive: !on });
                reload();
              } catch (e) {
                Alert.alert("Could not change the status", errText(e, "Please try again."));
              }
            },
          },
        ],
      );
    },
    [reload],
  );

  const removeCompany = useCallback(
    (c) => {
      Alert.alert(`Delete ${nameOf(c)}?`, "Only a company without staff or logins can be deleted. This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await companyService.remove(c._id);
              reload();
            } catch (e) {
              Alert.alert("Could not delete the company", errText(e, "Please try again."));
            }
          },
        },
      ]);
    },
    [reload],
  );

  // Saved from the form: refresh the list; a new company with an invite shows its link at once.
  const onSaved = (saved, created, invite) => {
    setFormFor(null);
    reload();
    if (created && saved && invite?.token) {
      setAdminFor({ company: saved, invite: { token: invite.token, expiresAt: invite.expiresAt } });
    } else if (created && saved) {
      Alert.alert(`${nameOf(saved)} created`, "Open it to complete its profile (logo, address, registration numbers).");
    }
  };

  const header = (
    <View>
      <LinearGradient
        colors={[colors.headerFrom, colors.headerVia, colors.headerTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderBottomLeftRadius: radius.xl + 6,
          borderBottomRightRadius: radius.xl + 6,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 46,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* The super admin's own profile photo */}
          <View
            style={{
              borderRadius: 32,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.65)",
              overflow: "hidden",
            }}
          >
            <Avatar name={user?.name} uri={myPhotoUrl} size={54} self />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>{greeting()},</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }} numberOfLines={1}>
              {user?.name || "Super admin"}
            </Text>
            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 4,
                paddingHorizontal: 9,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.6 }}>SUPER ADMIN</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={logout}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: "rgba(255,255,255,0.18)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Log out</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 20 }}>Your companies</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
          Pick a company to open its dashboard.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <HeaderStat value={totals.companies} label="Companies" />
          <HeaderStat value={totals.staff} label="Total staff" />
          <HeaderStat value={totals.active} label="Active" />
        </View>

        <TouchableOpacity
          onPress={() => setFormFor({})}
          activeOpacity={0.85}
          style={{
            marginTop: 14,
            paddingVertical: 12,
            borderRadius: radius.md,
            alignItems: "center",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14.5 }}>＋  Add company</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Search card overlapping the header */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: -24,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search companies"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, paddingVertical: 13, fontSize: 14.5, color: colors.text }}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {companyNotice ? (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            padding: 12,
            borderRadius: radius.md,
            backgroundColor: "#FEF3C7",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#92400E" }}>{companyNotice}</Text>
        </View>
      ) : null}

      {countries.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}
        >
          <Chip label="All" count={rows.length} selected={!countryFilter} onPress={() => setCountryFilter("")} />
          {countries.map((c) => (
            <Chip
              key={c.code}
              label={c.label}
              count={c.count}
              selected={countryFilter === c.code}
              onPress={() => setCountryFilter(c.code)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ height: 14 }} />
    </View>
  );

  // Modals live outside the list so they also work while it is loading / failed to load.
  const modals = (
    <>
      {formFor ? (
        <CompanyFormModal
          key={formFor._id || "new"}
          visible
          company={formFor._id ? formFor : null}
          countries={serverCountries}
          onClose={() => setFormFor(null)}
          onSaved={onSaved}
        />
      ) : null}
      {adminFor ? (
        <CompanyAdminModal
          key={`${adminFor.company._id}-${adminFor.invite ? "new" : "open"}`}
          visible
          company={adminFor.company}
          initialInvite={adminFor.invite || null}
          onClose={() => setAdminFor(null)}
          onChanged={reload}
        />
      ) : null}
    </>
  );

  // First load → spinner; failed first load → message + retry.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        {header}
        <Loading />
        {modals}
      </View>
    );
  }
  if (error && !items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        {header}
        <ErrorState message={error} />
        {modals}
        <TouchableOpacity
          onPress={refresh}
          activeOpacity={0.85}
          style={{
            alignSelf: "center",
            marginBottom: 24 + insets.bottom,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      {modals}
      <FlatList
        data={shown}
        keyExtractor={(c) => String(c._id)}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <FadeInUp index={index}>
              <CompanyCard
                company={item}
                last={!!lastCompanyId && String(lastCompanyId) === String(item._id)}
                onOpen={open}
                onEdit={setFormFor}
                onAdmin={(c) => setAdminFor({ company: c })}
                onToggle={toggleActive}
                onDelete={removeCompany}
              />
            </FadeInUp>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState emoji="🏢" message={rows.length ? "No company matches your search." : "No companies yet. Tap “Add company” to create the first one."} />
        }
        ListFooterComponent={
          rows.length ? (
            <Text style={{ textAlign: "center", fontSize: 11.5, color: colors.textMuted, paddingHorizontal: 24, marginTop: 4 }}>
              You add and manage companies here. Inside a client company you can only view — its own admin adds staff and edits its details.
              Staff and admins sign in to their own company and only ever see their own data.
            </Text>
          ) : null
        }
      />
    </View>
  );
}
