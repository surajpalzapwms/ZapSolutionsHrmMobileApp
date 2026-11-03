// src/utils/format.js — display helpers shared by the redesigned screens.
import { SHORT_MONTHS } from "./constants";
import { currencySymbol, moneyLocale } from "./tenant";

// "08.00 AM" style used on the Home attendance card.
export function formatClock(value) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--:--";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatTime(value) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// "12 Sep 2026"
export function formatShortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// "2026-09" -> "Sep 2026"
export function formatPeriod(period) {
  if (!period) return "—";
  const m = /^(\d{4})-(\d{1,2})/.exec(String(period));
  if (!m) return String(period);
  return `${SHORT_MONTHS[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

// "₹12,500.00" / "SAR 12,500.00" — always 2 decimals; symbol + digit grouping
// follow the logged-in company's country (see config/tenants.js).
export function formatMoney(amount) {
  const n = Number(amount);
  if (amount === null || amount === undefined || isNaN(n)) return "—";
  return formatMoneyZero(n);
}

// Same, but a missing / bad value shows as 0.00 (used inside tables and PDFs).
export function formatMoneyZero(amount) {
  return `${currencySymbol()}${(Number(amount) || 0).toLocaleString(moneyLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function workedMinutes(login, logout, upToNow = false) {
  const start = login ? new Date(login).getTime() : NaN;
  const end = logout ? new Date(logout).getTime() : upToNow ? Date.now() : NaN;
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}

// "HH:MM" worked, or "--:--"
export function totalHours(login, logout, upToNow = false) {
  const mins = workedMinutes(login, logout, upToNow);
  if (mins <= 0) return "--:--";
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// "YYYY-MM-DD" in local time
export function toDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
