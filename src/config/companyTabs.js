// src/config/companyTabs.js — the top-level tabs a company can have.
// Same list as the backend's TAB_TREE (backend/config/permissions.js) and the website's
// utils/permissionTabs.js. "staff" and "settings" are always on (the server forces them).
export const COMPANY_TABS = [
  { key: "staff", label: "Staff" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "staffbasicpayroll", label: "Staff Basic Payroll" },
  { key: "finalsettlement", label: "Final Settlement" },
  { key: "advance", label: "Advance" },
  { key: "expenses", label: "Expenses" },
  { key: "resignations", label: "Resignations" },
  { key: "settings", label: "Settings (logo, currency)" },
];

export const ALWAYS_ON_TABS = ["staff", "settings"];

// Used only when GET /api/company/countries cannot be reached.
// The server supports exactly these (backend/config/countries.js) — NOT the ~250 countries
// in src/config/countries.js, which are only used for flags / formatting.
export const FALLBACK_COUNTRIES = [
  { code: "IN", name: "India", currencyCode: "INR", timeZone: "Asia/Kolkata", weeklyOffDays: [0] },
  { code: "SA", name: "Saudi Arabia", currencyCode: "SAR", timeZone: "Asia/Riyadh", weeklyOffDays: [5, 6] },
  { code: "QA", name: "Qatar", currencyCode: "QAR", timeZone: "Asia/Qatar", weeklyOffDays: [5, 6] },
  { code: "OTHER", name: "Other", currencyCode: "USD", timeZone: "UTC", weeklyOffDays: [0] },
];

export const slugify = (v) =>
  String(v || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
