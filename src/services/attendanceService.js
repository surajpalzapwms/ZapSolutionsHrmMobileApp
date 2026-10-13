// src/services/attendanceService.js
import api from "../utils/api";

export const attendanceService = {
  getAttendance: (params) => api.get("/api/hrm/leaves/attendance", { params }),
  recordAttendance: (data) =>
    api.post("/api/hrm/leaves/attendance/record", data),
  // Self sign-in / sign-out (shift window per user, lunch break excluded;
  // sign-out unlocks after 7h45m worked, or once an admin approves early).
  getMyTodayAttendance: () => api.get("/api/hrm/leaves/attendance/me/today"),
  signIn: () => api.post("/api/hrm/leaves/attendance/checkin"),
  // body (optional, automatic sign-out): { logoutTime, auto: true, reason }
  // — logoutTime is when the phone actually left the office; a server that
  // does not read it simply uses "now".
  signOut: (body) => api.post("/api/hrm/leaves/attendance/checkout", body || undefined),
  // Admin only: everyone who has clocked in today. `withUser=1` asks the
  // (updated) backend to include each person's name; older servers ignore it.
  getTodayAttendanceList: () =>
    api.get("/api/hrm/attendance/today", { params: { withUser: 1 } }),
  // Logged-in user's own month / annual calendar — any role.
  // params: { year, month (0-11) } or { year, mode: "annual" }
  getMyCalendar: (params) =>
    api.get("/api/hrm/leaves/my-attendance/calendar", { params }),
  // Admin: view who's currently signed in today, and approve/revoke an
  // early sign-out for a specific user.
  getOpenAttendanceToday: () =>
    api.get("/api/hrm/leaves/attendance/open-today"),
  setEarlySignOutPermission: (userId, allow = true) =>
    api.post("/api/hrm/leaves/attendance/allow-early-signout", {
      userId,
      allow,
    }),
  deleteAttendance: (id) => api.delete(`/api/hrm/leaves/attendance/${id}`),
  deleteByDate: (userId, date) =>
    api.delete(`/api/hrm/leaves/attendance/date/${userId}/${date}`),
  getExtraHours: (userId, params) =>
    api.get(`/api/hrm/leaves/attendance/extra-hours/${userId}`, { params }),
  convertToLeave: (data) =>
    api.post("/api/hrm/leaves/attendance/convert-to-leave", data),
  getLeaves: (params) => api.get("/api/hrm/leaves", { params }),
  applyLeave: (data) => api.post("/api/hrm/leaves", data),
  deleteLeave: (id) => api.delete(`/api/hrm/leaves/${id}`),
  getStaffSummary: () => api.get("/api/hrm/leaves/staff-summary"),
  getStaffCalendar: (staffId, params) =>
    api.get(`/api/hrm/leaves/staff-summary/${staffId}/calendar`, { params }),

  // ── Leave requests: staff self-service + admin approval ─────────────────
  // Staff member: submit a request / see their own requests + status.
  getMyLeaveRequests: () => api.get("/api/hrm/leaves/requests/my"),
  // Payload: { fromDate: "YYYY-MM-DD", toDate: "YYYY-MM-DD", reason, leaveType }
  submitLeaveRequest: (data) => api.post("/api/hrm/leaves/requests/my", data),
  // Admin: review pending requests (or all, filtered by status) and decide.
  getPendingLeaveRequests: () => api.get("/api/hrm/leaves/requests/pending"),
  getAllLeaveRequests: (params) =>
    api.get("/api/hrm/leaves/requests/all", { params }),
  approveLeaveRequest: (id) =>
    api.put(`/api/hrm/leaves/requests/${id}/approve`),
  rejectLeaveRequest: (id, remarks) =>
    api.put(`/api/hrm/leaves/requests/${id}/reject`, { remarks }),
  // Multi-day ("range") requests: approve/reject every day in one action.
  approveLeaveGroup: (groupId) =>
    api.put(`/api/hrm/leaves/requests/group/${groupId}/approve`),
  rejectLeaveGroup: (groupId, remarks) =>
    api.put(`/api/hrm/leaves/requests/group/${groupId}/reject`, { remarks }),
};
