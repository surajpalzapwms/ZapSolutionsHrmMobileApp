// src/services/companyService.js — client companies, for the SUPER ADMIN only
// (the same calls the website's "Companies" page makes).
//
//   GET    /api/company                         → { data: [ { _id, name, slug, isActive, country, countryName,
//                                                  currencyCode, logoUrl, primaryColor, staffCount, adminCount,
//                                                  maxStaff, enabledTabs, customDomain, officeNetworks,
//                                                  profileComplete … } ], countries, tabTree }
//   POST   /api/company                         → create (name, country, slug?, inviteAdmin?, …)
//   PUT    /api/company/:id                     → edit / activate / deactivate
//   DELETE /api/company/:id                     → only a company with no staff and no logins
//   GET    /api/company/:id/admins              → the company admin + branch admins
//   GET    /api/company/:id/admin-invites       → recent one-time admin links
//   POST   /api/company/:id/admin-invites       → new one-time link { email?, days? } → { token, data }
//   DELETE /api/company/:id/admin-invites/:inviteId
//
// After a company is tapped, every request carries `X-Company-Id: <_id>` (api.js) and
// the server works inside that company, exactly like the website after "Open".
import api from "../utils/api";

export const companyService = {
  // Public: country presets the SERVER supports (currency, time zone, weekly off days).
  countries: () => api.get("/api/company/countries"),

  list: () => api.get("/api/company"),
  create: (data) => api.post("/api/company", data),
  update: (id, data) => api.put(`/api/company/${id}`, data),
  remove: (id) => api.delete(`/api/company/${id}`),

  admins: (id) => api.get(`/api/company/${id}/admins`),
  adminInvites: (id) => api.get(`/api/company/${id}/admin-invites`),
  createAdminInvite: (id, data) => api.post(`/api/company/${id}/admin-invites`, data),
  cancelAdminInvite: (id, inviteId) => api.delete(`/api/company/${id}/admin-invites/${inviteId}`),
};
