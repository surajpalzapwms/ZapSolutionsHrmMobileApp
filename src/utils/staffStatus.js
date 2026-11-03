// src/utils/staffStatus.js
//
// Same rule the website uses (frontend/src/utils/staffStatus.js) for
// "has this staff member left the organization?" — status "Relieved" and a
// relieving date that is today or earlier. A relieving date still in the
// future means they are serving their notice period and still work here.
// "Relieved" with no relieving date recorded counts as left.
import { utcOffsetMs } from "./tenant";

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

// "YYYY-MM-DD" of a stored date, read in the COMPANY's time zone (India = IST
// UTC+5:30, Saudi Arabia = UTC+3 …). Done with a fixed offset instead of
// Intl timeZone support, which not every phone JS engine has.
export const dateKeyFrom = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + utcOffsetMs()).toISOString().slice(0, 10);
};
