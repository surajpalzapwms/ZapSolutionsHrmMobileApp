import api from "./client";

// All return { success, attendance, meta } (meta has workedMinutes,
// remainingMinutes, canSignOut, shiftStartTime, shiftEndTime, ...).
export const getMyToday = () =>
  api.get("/api/hrm/leaves/attendance/me/today").then((r) => r.data);

export const signIn = () =>
  api.post("/api/hrm/leaves/attendance/checkin").then((r) => r.data);

export const signOut = () =>
  api.post("/api/hrm/leaves/attendance/checkout").then((r) => r.data);

// Staff attendance summary used on the analytics screen.
export const getStaffSummary = () =>
  api.get("/api/hrm/leaves/staff-summary").then((r) => r.data);

// The caller's own leave requests (used for the Time Off / Activity area).
export const getMyLeaveRequests = () =>
  api.get("/api/hrm/leaves/requests/my").then((r) => r.data);
