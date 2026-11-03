// src/config/tenants.js — country rules.
//
// A "tenant" = one company in one country. There is NO fixed list of
// companies: any number of companies, in any country (several in India,
// several in Saudi Arabia, …), come from the server by company code.
// Countries: every country is in countries.js; a company can also override
// currency / time zone / weekend from the server.
import COUNTRY_ROWS from "./countries";

export const COUNTRIES = COUNTRY_ROWS.map(([code, name, currency, symbol, timezone, utcOffsetMinutes, weekend]) => ({
  code,
  name,
  currency,
  symbol,
  timezone,
  utcOffsetMinutes,
  weekend,
  // India uses lakh/crore grouping; everyone else standard grouping.
  locale: code === "IN" ? "en-IN" : "en-US",
  // 🇮🇳 from the 2-letter code (regional-indicator letters)
  flag: String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)),
}));

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

// India first, then A–Z — the usual starting point for the picker.
export const sortedCountries = () => [
  BY_CODE.get("IN"),
  ...COUNTRIES.filter((c) => c.code !== "IN"),
];

// Unknown / missing code → a neutral entry (never silently "India").
const UNKNOWN = {
  code: "",
  name: "—",
  flag: "🌐",
  currency: "",
  symbol: "",
  locale: "en-US",
  timezone: "UTC",
  utcOffsetMinutes: 0,
  weekend: [6, 0],
};

export const getCountry = (code) => BY_CODE.get(String(code || "").toUpperCase()) || UNKNOWN;

// ZAP Solutionz is the original company of this app. It is only used to keep
// the bundled ZAP logo / payslip letterhead for ZAP staff — it is NOT a default
// for anyone else.
export const DEFAULT_COMPANY = { code: "ZAP", name: "ZAP Solutionz" };
// Same rule as the backend: the ZAP artwork is for a company whose name (or link
// name) starts with "ZAP". Nothing known about the company yet → keep the old default.
export const isDefaultCompany = (code, name) => {
  const c = String(code || "").trim().toUpperCase();
  const n = String(name || "").trim().toUpperCase();
  if (!c && !n) return true;
  return c === DEFAULT_COMPANY.code || c.startsWith("ZAP") || n.startsWith("ZAP");
};
