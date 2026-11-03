// src/services/staffService.js
import api from "../utils/api";

export const staffService = {
  // Staff for every screen EXCEPT the Staff tab: staff an admin has disabled are
  // left out by the server.
  getAll: () => api.get("/api/staff"),
  // Staff tab only: everyone, including disabled staff (so they can be enabled again).
  getAllIncludingHidden: () => api.get("/api/staff", { params: { includeHidden: true } }),
  getById: (id) => api.get(`/api/staff/${id}`),
  create: (data) => api.post("/api/staff", data),
  update: (id, data) => api.put(`/api/staff/${id}`, data),
  delete: (id) => api.delete(`/api/staff/${id}`),
  deleteMany: (ids) => api.delete("/api/staff", { data: { ids } }),
  import: (data) => api.post("/api/staff/import", data),
  toggleStatus: (id, isActive) => api.put(`/api/staff/status/${id}`, { isActive }),
  getTeams: () => api.get("/api/staff/teams"),
  getActiveStaff: () => api.get("/api/hrm/advances/staffs-list"),
  // Logged-in account's own Staff profile (used by "My Payslips" / leave
  // request screens to resolve which staff record belongs to them).
  getMyProfile: () => api.get("/api/staff/me"),
  // Full & Final Settlement Statement (same endpoint the website uses).
  // For a staff member who has left, `id` is their own Staff _id.
  getSettlement: (id) => api.get(`/api/staff/${id}/settlement`),
  // Referral organisation + first-month commission (super admin only).
  setReferral: (id, data) => api.put(`/api/staff/${id}/referral`, data),
  clearReferral: (id) => api.delete(`/api/staff/${id}/referral`),
};