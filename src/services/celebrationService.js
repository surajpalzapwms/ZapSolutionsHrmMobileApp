// src/services/celebrationService.js — feeds the Home "Birthday / Holiday" banner.
import api from "../utils/api";
import { unwrapList } from "../utils/helpers";
import { staffService } from "./staffService";

// { today: Birthday[], upcoming: Birthday[] }
// Birthday = { id, name, date: "YYYY-MM-DD" (next birthday), daysUntil, photoUrl, isSelf }
// Backend: GET /api/staff/birthdays/upcoming?days=N
// The photo link can arrive under different names, as a plain string or as
// an object ({ url }), directly on the birthday or on a nested staff record,
// or inside a documents list. Accept every shape so a photo uploaded by any
// staff member shows on everyone's birthday list.
const linkOf = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") return linkOf(v.url || v.uri || v.path || v.signedUrl || v.photoUrl);
  return null;
};
export function birthdayPhotoOf(b) {
  if (!b || typeof b !== "object") return null;
  const direct =
    linkOf(b.photoUrl) ||
    linkOf(b.photo) ||
    linkOf(b.profilePhoto) ||
    linkOf(b.profilePhotoUrl) ||
    linkOf(b.avatar) ||
    linkOf(b.image);
  if (direct) return direct;
  for (const k of ["staff", "employee", "employeeId", "staffId", "user", "userId"]) {
    if (b[k] && typeof b[k] === "object") {
      const nested = birthdayPhotoOf(b[k]);
      if (nested) return nested;
    }
  }
  if (Array.isArray(b.documents)) {
    const doc = b.documents.find((d) => d?.type === "photo" && (d.uploaded !== false));
    if (doc) return linkOf(doc.url || doc);
  }
  return null;
}

const staffIdOf = (b) => {
  for (const k of ["staffId", "employeeId", "staff", "employee"]) {
    const v = b[k];
    if (v && typeof v === "object" && (v._id || v.id)) return String(v._id || v.id);
    if (v && typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) return v;
  }
  return b._id ? String(b._id) : null;
};

export async function getBirthdays(days = 60) {
  const res = await api.get("/api/staff/birthdays/upcoming", {
    // _t: never let a proxy / OkHttp cache return yesterday's list, which
    // still had no photo for someone who uploaded one since.
    params: { days, _t: Date.now() },
    headers: { "Cache-Control": "no-cache" },
  });
  const list = unwrapList(res.data).map((b) => ({
    id: b._id || staffIdOf(b) || `${b.staffName}-${b.date}`,
    staffId: staffIdOf(b),
    name: b.staffName || b.name || b.staff?.staffName || "Staff",
    date: String(b.date || "").slice(0, 10),
    daysUntil: Number(b.daysUntil) || 0,
    // Photo link (relative or full) — <Avatar> adds the server address,
    // the login token and the cache version.
    photoUrl: birthdayPhotoOf(b),
    isSelf: !!b.isSelf,
    team: b.team || b.teamName || "",
    canWish: b.canWish !== false,
    wishedByMe: !!b.wishedByMe,
    wishCount: Number(b.wishCount) || 0,
  }));
  return {
    today: list.filter((b) => b.daysUntil === 0),
    upcoming: list.filter((b) => b.daysUntil > 0),
  };
}

function parseLocalYMD(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Local "YYYY-MM-DD" for a Date (no UTC shift).
function toYMD(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysBetween(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function normalizeHoliday(h) {
  const date = String(h.startDate || h.date || "").slice(0, 10);
  return {
    _id: h._id,
    date,
    endDate: String(h.endDate || date).slice(0, 10),
    name: h.name || h.title || "Holiday",
    isSaturdayHoliday: h.type === "Saturday" || !!h.virtual,
  };
}

// Named holidays + admin "2nd/4th Saturday" rule dates for one year.
export async function getHolidaysForYear(year) {
  const [named, saturdays] = await Promise.all([
    api.get("/api/hrm/holidays", { params: { year } }).catch(() => ({ data: [] })),
    api.get("/api/hrm/saturday-holidays/dates", { params: { year } }).catch(() => ({ data: [] })),
  ]);
  return [...unwrapList(named.data), ...unwrapList(saturdays.data)].map(normalizeHoliday);
}

// { today: UpcomingHoliday[], upcoming: UpcomingHoliday[] } within `withinDays`.
export async function getUpcomingHolidays(withinDays = 60) {
  const now = new Date();
  const years = [now.getFullYear()];
  const end = new Date();
  end.setDate(end.getDate() + withinDays);
  if (end.getFullYear() !== now.getFullYear()) years.push(end.getFullYear());

  const lists = await Promise.all(years.map((y) => getHolidaysForYear(y)));
  const byDate = new Map();
  lists.flat().forEach((h) => {
    if (h.date && !byDate.has(h.date)) byDate.set(h.date, h);
  });

  const today = [];
  const upcoming = [];
  for (const h of byDate.values()) {
    const daysUntil = daysBetween(now, parseLocalYMD(h.date));
    if (daysUntil < 0 || daysUntil > withinDays) continue;
    const item = { ...h, daysUntil, isToday: daysUntil === 0, isTomorrow: daysUntil === 1 };
    (daysUntil === 0 ? today : upcoming).push(item);
  }
  today.sort((a, b) => (a.date < b.date ? -1 : 1));
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return { today, upcoming };
}

// ── Current year only (1 Jan – 31 Dec), today onwards ──────────────────────
// Used by the Home cards AND the "View all" lists. Anything already over is
// dropped; nothing from next year is shown.

function daysLeftInYear(now = new Date()) {
  return daysBetween(now, new Date(now.getFullYear(), 11, 31));
}

// Holidays from today to 31 Dec of this year, nearest first.
// A multi-day holiday stays visible until its last day has passed.
export async function getYearHolidays() {
  const now = new Date();
  const year = now.getFullYear();
  const list = await getHolidaysForYear(year);

  const seen = new Set();
  const out = [];
  for (const h of list) {
    if (!h.date || !h.date.startsWith(String(year))) continue;
    const key = `${h.date}|${h.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const endDate = h.endDate && h.endDate >= h.date ? h.endDate : h.date;
    const daysUntil = daysBetween(now, parseLocalYMD(h.date));
    const daysUntilEnd = daysBetween(now, parseLocalYMD(endDate));
    if (daysUntilEnd < 0) continue; // already gone

    // Multi-day holiday already running (e.g. Diwali 9–12 Nov, checked on
    // 10 Nov): show only the remaining days → "10 Nov – 12 Nov".
    // On or before the first day the full range is shown → "9 Nov – 12 Nov".
    const started = daysUntil < 0;
    out.push({
      ...h,
      startDate: h.date, // original first day, kept for reference
      date: started ? toYMD(now) : h.date,
      endDate,
      daysUntil: Math.max(daysUntil, 0),
      daysLeft: daysUntilEnd + 1, // days remaining including today
    });
  }
  out.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
  return out;
}

// Admin / super admin: a birthday that came without a photo link gets the
// one from the full staff list (which admins can read). Staff accounts skip
// this — /api/staff is admin-only.
// The full staff list is big — fetch it at most once every 5 minutes
// instead of on every Home focus (this made Home slow for admins).
let staffListCache = { at: 0, promise: null };
function cachedStaffList() {
  if (!staffListCache.promise || Date.now() - staffListCache.at > 5 * 60 * 1000) {
    staffListCache = {
      at: Date.now(),
      promise: staffService.getAll().catch((e) => {
        staffListCache = { at: 0, promise: null };
        throw e;
      }),
    };
  }
  return staffListCache.promise;
}

// Called after an admin enables / disables someone, so the next load asks the server again.
export function resetCelebrationCache() {
  staffListCache = { at: 0, promise: null };
}

async function fillMissingPhotos(list) {
  if (!list.some((b) => !b.photoUrl)) return list;
  try {
    const res = await cachedStaffList();
    const byId = {};
    const byName = {};
    unwrapList(res.data).forEach((s) => {
      const photo = birthdayPhotoOf(s);
      if (!photo) return;
      byId[String(s._id)] = photo;
      const n = String(s.staffName || s.name || "").toLowerCase();
      if (n) byName[n] = photo;
    });
    return list.map((b) =>
      b.photoUrl
        ? b
        : { ...b, photoUrl: (b.staffId && byId[b.staffId]) || byName[b.name.toLowerCase()] || null },
    );
  } catch {
    return list;
  }
}

// Birthdays from today to 31 Dec of this year, nearest first.
export async function getYearBirthdays({ isAdmin = false } = {}) {
  const now = new Date();
  const year = String(now.getFullYear());
  const days = Math.max(daysLeftInYear(now), 1);
  const { today, upcoming } = await getBirthdays(days);
  let list = [...today, ...upcoming]
    .filter((b) => b.date.startsWith(year) && b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
  if (isAdmin) list = await fillMissingPhotos(list);
  return list;
}

// Send a birthday wish (only on the day, not to yourself).
// Backend: POST /api/staff/birthdays/:id/wish  { message }
export async function wishBirthday(id, message) {
  const res = await api.post(`/api/staff/birthdays/${id}/wish`, { message });
  return res.data;
}

// Wishes the logged-in staff member received for this year's birthday.
// Backend: GET /api/staff/birthdays/my-wishes
export async function getMyBirthdayWishes() {
  const res = await api.get("/api/staff/birthdays/my-wishes", { params: { _t: Date.now() } });
  return unwrapList(res.data);
}
