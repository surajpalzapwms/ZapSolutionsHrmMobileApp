// src/utils/tenant.js — "which company + country is logged in", readable
// synchronously from anywhere (screens, PDF builders, the API client),
// the same idea as authToken.js.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCountry } from "../config/tenants";
import COUNTRY_ROWS from "../config/countries";

const KEY = "tenant";
const LAST_LOGIN_KEY = "lastLoginChoice"; // company code + country typed last time (not secret)

let current = null; // null = nobody logged in
const listeners = new Set();

const clean = (v) => String(v ?? "").trim();

// Build a tenant from what the SERVER says about the logged-in user.
// The server is the source of truth; `fallback` (what was typed on the login
// screen) is used only while an older server doesn't send company fields yet.
// Standard UTC offset of a time zone, taken from the country table (several
// countries share one, e.g. Asia/Riyadh). null when the zone is not in the table.
const OFFSET_BY_ZONE = new Map(COUNTRY_ROWS.map((r) => [r[4], r[5]]));

// The server sends the company as { _id, name, slug, country, currencyCode,
// timeZone, weeklyOffDays, logoUrl, primaryColor … } (white-label backend);
// older field names (code, currency, timezone, weekend) are still understood.
export function buildTenant(user, fallback = {}) {
  const co = user?.company && typeof user.company === "object" ? user.company : {};
  const code = clean(co.code || co.slug || user?.companyCode || fallback.companyCode).toUpperCase();
  const countryCode = clean(co.country || user?.country || user?.countryCode || fallback.country).toUpperCase();
  const country = getCountry(countryCode);
  const weekendRaw = Array.isArray(co.weeklyOffDays) ? co.weeklyOffDays : co.weekend;
  const timezone = clean(co.timeZone || co.timezone || user?.timezone) || country.timezone;
  const zoneOffset = OFFSET_BY_ZONE.get(timezone);
  return {
    companyId: clean(co._id || co.id || user?.companyId || fallback.companyId) || null,
    companyCode: code,
    companyName: clean(co.name || user?.companyName || fallback.companyName) || code,
    country: country.code,
    currency: clean(co.currencyCode || co.currency || user?.currency || fallback.currency) || country.currency,
    currencySymbol: clean(co.currencySymbol || fallback.currencySymbol) || null,
    weekend: Array.isArray(weekendRaw) ? weekendRaw.map(Number) : fallback.weekend || null,
    timezone,
    utcOffsetMinutes: Number.isFinite(Number(co.utcOffsetMinutes))
      ? Number(co.utcOffsetMinutes)
      : zoneOffset ?? country.utcOffsetMinutes,
    logoUrl: clean(co.logoUrl || user?.companyLogoUrl || fallback.logoUrl) || null,
    primaryColor: clean(co.primaryColor || fallback.primaryColor) || null,
    signatory: clean(co.signatory || fallback.signatory) || null, // name printed on payslips
    // The OWNER company is the super admin's own; every other one is a CLIENT
    // company that its own admin runs (the super admin can only view it).
    // A refresh that does not carry the flag must not flip the answer, so the
    // value already known for the same company is kept (same rule as the website).
    isOwner:
      typeof co.isOwner === "boolean"
        ? co.isOwner
        : fallback.isOwner === true &&
          (!fallback.companyId || !co._id || String(fallback.companyId) === String(co._id)),
  };
}

// A super admin belongs to no company: they pick one from the company list (see
// CompanyListScreen) and the app then works inside it. This flag tells api.js that
// a "this company is gone / closed" answer means "go back to the list", not "log out".
let superSession = false;
export const setSuperAdminSession = (v) => {
  superSession = !!v;
};
export const isSuperAdminSession = () => superSession;

export const getTenant = () => current;

// Super admin looking at a CLIENT company (not the owner company): VIEW ONLY.
// That company's own admin adds / edits its records, so every add / edit / delete
// is hidden for the super admin there and the API client refuses the call (the
// server refuses it too: 403 CLIENT_COMPANY_READ_ONLY). Same rule as the website's
// isCompanyViewOnly().
export const isCompanyViewOnly = () => superSession && !!current?.companyId && current.isOwner !== true;
export const subscribeTenant = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export async function setTenant(t) {
  current = t || null;
  listeners.forEach((fn) => fn(current));
  try {
    if (t) await AsyncStorage.setItem(KEY, JSON.stringify(t));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // storage failure: the in-memory value still works for this session
  }
}

export async function loadStoredTenant() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    current = raw ? JSON.parse(raw) : null;
  } catch {
    current = null;
  }
  listeners.forEach((fn) => fn(current));
  return current;
}

// What the login screen pre-fills next time (company code + country only).
export async function saveLastLogin(choice) {
  try {
    await AsyncStorage.setItem(LAST_LOGIN_KEY, JSON.stringify(choice));
  } catch {
    // ignore
  }
}
export async function loadLastLogin() {
  try {
    const raw = await AsyncStorage.getItem(LAST_LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── helpers other files use ────────────────────────────────────────────────
const countryOf = () => getCountry(current?.country);

// Company overrides (sent by the server) win over the country defaults.
export const currencySymbol = () => {
  if (current?.currencySymbol) return current.currencySymbol;
  const c = countryOf();
  // company currency differs from the country's → show its code
  if (current?.currency && c.currency && current.currency !== c.currency) return `${current.currency} `;
  return c.symbol || (current?.currency ? `${current.currency} ` : "");
};
export const moneyLocale = () => countryOf().locale;
export const utcOffsetMs = () =>
  (Number.isFinite(current?.utcOffsetMinutes) ? current.utcOffsetMinutes : countryOf().utcOffsetMinutes) * 60 * 1000;
export const weekendDays = () => current?.weekend || countryOf().weekend;
export const companyName = () => current?.companyName || "";

/**
 * Second safety net on the phone: if a list from the server contains rows that
 * belong to ANOTHER company (row.companyCode differs), drop them.
 * The real isolation is done by the server (see BACKEND_CHANGES.md §0) —
 * this only makes sure a server mistake can't show another company's rows.
 */
export function onlyMyCompany(rows) {
  if (!Array.isArray(rows) || !current?.companyCode) return rows;
  return rows.filter((r) => {
    const rc = r && typeof r === "object" ? clean(r.companyCode).toUpperCase() : "";
    return !rc || rc === current.companyCode;
  });
}
