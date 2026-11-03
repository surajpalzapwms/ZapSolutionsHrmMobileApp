// src/utils/phone.js — same rules as the website's utils/phone.js.
//
// Phone numbers are stored as ONE string: "+<country code> <number>",
// e.g. "+91 9876543210" or "+971 501234567".
// A plain-digit value ("9876543210", old data) is read as an Indian number.
//
// A NEW number starts with the COMPANY's country (Saudi company → 🇸🇦 +966, Qatar → 🇶🇦 +974 …);
// the user can still pick any other country.
import { getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import { getTenant } from "./tenant";
import { getCountry as getTenantCountry } from "../config/tenants";

export const DEFAULT_COUNTRY = "IN";

const ISO_LIST = new Set(getCountries());

// Country of the company in use (Saudi company -> "SA" ...). "Other" / unknown -> India.
export const companyPhoneCountry = () => {
  try {
    const iso = String(getTenant()?.country || "").toUpperCase();
    return iso && ISO_LIST.has(iso) ? iso : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
};

// Several countries share one calling code (+1, +7, +44 ...). When a stored number only tells
// us the code, this is the country shown for it.
const PREFERRED_COUNTRY_FOR_CODE = {
  1: "US", 7: "RU", 39: "IT", 44: "GB", 47: "NO", 61: "AU",
  212: "MA", 262: "RE", 358: "FI", 590: "GP", 599: "CW",
};

// Small territories share their parent's calling code; show the main country so the flag
// matches what the user picked.
const COLLAPSE_TO_MAIN = {
  GG: "GB", JE: "GB", IM: "GB", AX: "FI", CX: "AU", CC: "AU",
  EH: "MA", SJ: "NO", BL: "GP", MF: "GP", BQ: "CW", YT: "RE",
};

// 🇮🇳 from the 2-letter code (regional-indicator letters) — works on Android and iOS.
export const flagOf = (iso) =>
  /^[A-Z]{2}$/.test(String(iso)) ? String.fromCodePoint(...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : "🌐";

// Calling-code regions the app's country table does not list.
const EXTRA_NAMES = { AC: "Ascension Island", TA: "Tristan da Cunha", XK: "Kosovo" };

// [{ iso: "IN", name: "India", dial: "91", flag: "🇮🇳" }, ...] — A–Z by name. Names come from the
// app's own country table (no Intl.DisplayNames needed on the phone).
export const COUNTRIES = getCountries()
  .map((iso) => {
    const known = getTenantCountry(iso);
    return { iso, name: known.code ? known.name : EXTRA_NAMES[iso] || iso, dial: String(getCountryCallingCode(iso)), flag: flagOf(iso) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_ISO = Object.fromEntries(COUNTRIES.map((c) => [c.iso, c]));
export const getPhoneCountry = (iso) => BY_ISO[iso] || BY_ISO[DEFAULT_COUNTRY];

// The company's country first in the picker, then A–Z.
export const orderedCountries = (home = companyPhoneCountry()) => {
  const i = COUNTRIES.findIndex((c) => c.iso === home);
  if (i <= 0) return COUNTRIES;
  return [COUNTRIES[i], ...COUNTRIES.slice(0, i), ...COUNTRIES.slice(i + 1)];
};

// Longest calling-code match for "+<digits>" values libphonenumber could not place on a country.
const countryFromDigits = (digits) => {
  for (let len = 3; len >= 1; len -= 1) {
    const code = digits.slice(0, len);
    if (PREFERRED_COUNTRY_FOR_CODE[code]) return { iso: PREFERRED_COUNTRY_FOR_CODE[code], national: digits.slice(len) };
    const hit = COUNTRIES.find((c) => c.dial === code);
    if (hit) return { iso: hit.iso, national: digits.slice(len) };
  }
  return null;
};

// Stored string -> { country: "IN", national: "9876543210" }
export const parsePhone = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return { country: companyPhoneCountry(), national: "" };

  if (raw.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed?.country) {
      return { country: COLLAPSE_TO_MAIN[parsed.country] || parsed.country, national: parsed.nationalNumber };
    }
    const hit = countryFromDigits(raw.replace(/\D/g, ""));
    if (hit) return { country: hit.iso, national: hit.national };
  }

  // Old data: no country code -> India. Tidy the usual leftovers ("09876543210", "919876543210").
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return { country: DEFAULT_COUNTRY, national: digits };
};

// { country, national } -> stored string ("" when there is no number).
export const formatPhone = (country, national) => {
  const digits = String(national ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return `+${getPhoneCountry(country).dial} ${digits}`;
};

// Valid for the selected country (length + pattern rules of that country).
export const isValidPhone = (value) => {
  const { country, national } = parsePhone(value);
  if (!national) return false;
  return isValidPhoneNumber(national, country);
};
