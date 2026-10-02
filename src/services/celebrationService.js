// src/services/celebrationService.js — feeds the Home "Birthday / Holiday" banner.
import api from "../utils/api";
import { unwrapList } from "../utils/helpers";

// { success, today: Birthday[], upcoming: Birthday[] }
export async function getBirthdays(days = 30) {
  const res = await api.get("/api/staff/birthdays", { params: { days } });
  const p = res.data || {};
  return { today: p.today || [], upcoming: p.upcoming || [] };
}

function parseLocalYMD(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetween(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function normalizeHoliday(h) {
  return {
    _id: h._id,
    date: String(h.startDate || h.date || "").slice(0, 10),
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
