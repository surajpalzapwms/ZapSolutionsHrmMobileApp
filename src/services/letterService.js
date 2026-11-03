// src/services/letterService.js — which HR letters the logged-in staff
// member can open. A letter is only enabled after an admin / super admin
// has generated it from the website (Staff → Letters).
// Backend: GET /api/hrm/letters -> [{ type, title, available, issued, reason }]
import api from "../utils/api";

export async function getMyLetters() {
  const res = await api.get("/api/hrm/letters");
  const list = Array.isArray(res.data?.data) ? res.data.data : [];
  const map = {};
  list.forEach((l) => {
    map[l.type] = {
      available: Boolean(l.available),
      issued: Boolean(l.issued),
      reason: l.reason || "",
      issuedAt: l.issuedAt || null,
      issuedByName: l.issuedByName || "",
    };
  });
  return map;
}

// ── Admin / super admin ────────────────────────────────────────────────────
// [{ type, title, eligible, issued, issuedAt, issuedByName, reason }]
export async function getStaffLetters(staffId) {
  const res = await api.get(`/api/hrm/letters/staff/${staffId}`);
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

// Any of the six letters: the details form —
// { fields: [{ key, label, kind, required, missing, value, options }], missingCount }
export async function getLetterForm(staffId, type) {
  const res = await api.get(`/api/hrm/letters/staff/${staffId}/${type}/form`);
  return res.data?.data || { fields: [], missingCount: 0 };
}

// `details` = the values entered in the details form (every letter —
// Termination / Leaving / Experience carry the last working day).
export async function issueLetter(staffId, type, details) {
  const res = await api.post(`/api/hrm/letters/staff/${staffId}/${type}/issue`, details ? { details } : {});
  return res.data;
}

export async function revokeLetter(staffId, type) {
  const res = await api.delete(`/api/hrm/letters/staff/${staffId}/${type}/issue`);
  return res.data;
}

// Every letter generated so far (newest first); optional type filter.
export async function getIssuedLetters(type) {
  const res = await api.get("/api/hrm/letters/issued", { params: type ? { type } : undefined });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}
