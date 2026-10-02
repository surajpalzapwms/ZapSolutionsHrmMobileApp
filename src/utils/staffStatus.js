// src/utils/staffStatus.js
//
// Same rule the website uses (frontend/src/utils/staffStatus.js) for
// "has this staff member left the organization?" — status "Relieved" and a
// relieving date that is today or earlier. A relieving date still in the
// future means they are serving their notice period and still work here.
// "Relieved" with no relieving date recorded counts as left.

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const hasLeftOrganization = (staff) => {
  if (!staff || staff.status !== "Relieved") return false;
  if (!staff.relievingDate) return true;
  const relieving = new Date(staff.relievingDate);
  if (isNaN(relieving.getTime())) return true;
  relieving.setHours(0, 0, 0, 0);
  return relieving <= startOfToday();
};

export const isCurrentStaff = (staff) => !hasLeftOrganization(staff);

// "YYYY-MM-DD" of a stored date, read in India time (IST, UTC+5:30) — the
// same as the website's toISTDateKey. Done with a fixed offset instead of
// Intl timeZone support, which not every phone JS engine has.
const IST_OFFSET_MS = 330 * 60 * 1000;
export const dateKeyFrom = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
};
