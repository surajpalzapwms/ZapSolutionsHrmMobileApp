// src/presence/officeSession.js
// Today's "in office / went out / came back / left" log, kept on the phone.
//
//   in   09:02  (reached office: Wi-Fi or GPS circle)
//   out  13:05  ┐ lunch break 40 min (inside the lunch window → fine)
//   in   13:45  ┘
//   out  18:31  ← going time (no "in" after it)
//
// Every check (app open, Wi-Fi change, geofence enter/exit, background task)
// calls recordPresence(). A Wi-Fi blip shorter than BLIP_MS is ignored, so
// walking past a dead spot does not create a fake break.
//
// The log is saved per day ("officeLog:YYYY-MM-DD"); older days are removed.
// Screens subscribe with useOfficeDay().
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isLunchTime, officeConfig } from "./officeConfig";

const PREFIX = "officeLog:";
const BLIP_MS = 5 * 60 * 1000; // out + back within 5 min = not a real break

const pad = (n) => String(n).padStart(2, "0");
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const emptyDay = (date = dayKey()) => ({
  date,
  state: null, // "in" | "out" | null (not seen at office yet)
  events: [], // [{ type: "in"|"out", at: ms, via }]
  signOut: null, // { done, at, tried, message } — automatic sign-out status
});

let current = emptyDay();
let loadedDate = null; // which day has been read from the phone
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

async function save(day) {
  current = day;
  emit();
  try {
    await AsyncStorage.setItem(PREFIX + day.date, JSON.stringify(day));
  } catch {
    // memory copy still works for this session
  }
}

/** Read today's log from the phone (background tasks write it too). */
export async function loadToday() {
  const date = dayKey();
  try {
    const raw = await AsyncStorage.getItem(PREFIX + date);
    current = raw ? { ...emptyDay(date), ...JSON.parse(raw) } : emptyDay(date);
  } catch {
    current = emptyDay(date);
  }
  loadedDate = date;
  emit();
  cleanupOldDays(date);
  return current;
}

async function cleanupOldDays(today) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const old = keys.filter((k) => k.startsWith(PREFIX) && k !== PREFIX + today);
    if (old.length) await AsyncStorage.multiRemove(old);
  } catch {
    // ignore
  }
}

/** Logout: forget the log (the next person must not see it). */
export async function clearOfficeLog() {
  current = emptyDay();
  loadedDate = null;
  emit();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
  } catch {
    // ignore
  }
}

/**
 * Record what the latest check found.
 * @param {{inOffice:boolean, via?:string, at?:number}} p
 * @returns {Promise<object>} today's log (after the change)
 */
/** Today's log, read from the phone first if this process hasn't yet
 *  (a background task may run in a fresh JS process). */
export async function ensureToday() {
  if (loadedDate === dayKey() && current.date === loadedDate) return current;
  return loadToday();
}

export async function recordPresence({ inOffice, via = null, at = Date.now() }) {
  let day = await ensureToday();
  if (day.date !== dayKey(new Date(at))) day = emptyDay(dayKey(new Date(at)));

  const events = [...day.events];
  const last = events[events.length - 1];

  if (inOffice) {
    if (day.state === "in") return day;
    if (last?.type === "out" && at - last.at < BLIP_MS && !day.signOut?.done) {
      // Short Wi-Fi drop — pretend it never happened.
      events.pop();
    } else {
      events.push({ type: "in", at, via });
    }
    return save({ ...day, state: "in", events, signOut: day.signOut?.done ? day.signOut : null });
  }

  // Not in the office. Only matters if we saw them inside today.
  if (day.state !== "in") return day;
  events.push({ type: "out", at, via });
  return save({ ...day, state: "out", events });
}

/** Save the automatic sign-out status (done / tried / message). */
export async function setSignOutStatus(patch) {
  const day = await ensureToday();
  return save({ ...day, signOut: { ...(day.signOut || {}), ...patch } });
}

export const getToday = () => current;

// ── Summary for the screens ─────────────────────────────────────────────

/** Did a break overlap the lunch window? */
function overlapsLunch(from, to) {
  const start = new Date(from);
  const lunchStart = new Date(start);
  lunchStart.setHours(Math.floor(officeConfig.lunchFromMin / 60), officeConfig.lunchFromMin % 60, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(Math.floor(officeConfig.lunchUntilMin / 60), officeConfig.lunchUntilMin % 60, 0, 0);
  return from < lunchEnd.getTime() && to > lunchStart.getTime();
}

const minutes = (ms) => Math.max(0, Math.round(ms / 60000));

/**
 * @param {object} day        today's log
 * @param {object} attendance server record { loginTime, logoutTime }
 * @param {number} now
 * @returns {{
 *   firstIn:number|null, goingTime:number|null, isOut:boolean,
 *   breaks:Array<{from:number,to:number|null,minutes:number,lunch:boolean,open:boolean}>,
 *   outMinutes:number, lunchMinutes:number, insideMinutes:number
 * }}
 */
export function summarizeDay(day, attendance, now = Date.now()) {
  const ev = day?.date === dayKey(new Date(now)) ? day.events || [] : [];
  const loginMs = attendance?.loginTime ? new Date(attendance.loginTime).getTime() : null;
  const logoutMs = attendance?.logoutTime ? new Date(attendance.logoutTime).getTime() : null;

  const firstInEv = ev.find((e) => e.type === "in");
  const firstIn = loginMs || firstInEv?.at || null;

  const breaks = [];
  for (let i = 0; i < ev.length; i += 1) {
    if (ev[i].type !== "out") continue;
    const back = ev.slice(i + 1).find((e) => e.type === "in");
    const from = ev[i].at;
    if (back) {
      breaks.push({ from, to: back.at, minutes: minutes(back.at - from), lunch: overlapsLunch(from, back.at), open: false });
    } else {
      // Still out: during lunch it is a lunch break, otherwise they've gone.
      const to = now;
      breaks.push({ from, to: null, minutes: minutes(to - from), lunch: isLunchTime(new Date(from)), open: true });
    }
  }

  const openBreak = breaks.find((b) => b.open);
  // Going time comes ONLY from the server: it is the LAST time the phone
  // left the office, set once the shift is over. While the user is out (lunch
  // or anything else) it is just "out since …" — they may still come back.
  const goingTime = logoutMs || null;

  const closed = breaks.filter((b) => !b.open);
  const outMinutes = closed.filter((b) => !b.lunch).reduce((s, b) => s + b.minutes, 0);
  const lunchMinutes = closed.filter((b) => b.lunch).reduce((s, b) => s + b.minutes, 0)
    + (openBreak && !goingTime && openBreak.lunch ? openBreak.minutes : 0);

  const end = goingTime || (openBreak ? openBreak.from : now);
  const insideMinutes = firstIn
    ? Math.max(0, minutes(end - firstIn) - closed.reduce((s, b) => s + b.minutes, 0))
    : 0;

  return {
    firstIn,
    goingTime,
    isOut: !!openBreak && !logoutMs,
    breaks: breaks.filter((b) => !(b.open && logoutMs)),
    outMinutes,
    lunchMinutes,
    insideMinutes,
  };
}

// ── React hook ──────────────────────────────────────────────────────────
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => current;

export function useOfficeDay() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
