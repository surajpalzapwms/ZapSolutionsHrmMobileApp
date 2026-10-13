// src/services/documentService.js — profile photo + Aadhaar / PAN / light bill.
// Same API the website uses. Upload body is JSON with a base64 file (max 8 MB):
//   { type, data, mimeType, fileName, number }
//
//   Own documents:   GET / POST /api/documents/me      DELETE /api/documents/me/:type
//   Admin (any staff) GET / POST /api/documents/staff/:staffId
//                    DELETE /api/documents/staff/:staffId/:type
// Every response: { data: { staffName, photoUrl, documents: [ … ] } }
import api from "../utils/api";

const UPLOAD = { timeout: 120000 }; // a photo / PDF on a slow connection

export const DOCUMENT_META = {
  photo: { label: "Profile photo", emoji: "🙂", hint: "Square photo of your face" },
  aadhaar: {
    label: "Aadhaar Card",
    emoji: "🪪",
    hint: "Front side photo or PDF",
    numberLabel: "Aadhaar number",
    numberPlaceholder: "1234 5678 9012",
  },
  pan: {
    label: "PAN Card",
    emoji: "💳",
    hint: "Photo or PDF",
    numberLabel: "PAN number",
    numberPlaceholder: "ABCDE1234F",
  },
  lightBill: { label: "Light Bill", emoji: "💡", hint: "Latest electricity bill (address proof)" },
};

export const documentService = {
  // ── Logged-in staff member ──
  getMine: () => api.get("/api/documents/me"),
  uploadMine: (payload) => api.post("/api/documents/me", payload, UPLOAD),
  deleteMine: (type) => api.delete(`/api/documents/me/${type}`),

  // ── Admin / super admin ──
  getForStaff: (staffId) => api.get(`/api/documents/staff/${staffId}`),
  uploadForStaff: (staffId, payload) => api.post(`/api/documents/staff/${staffId}`, payload, UPLOAD),
  deleteForStaff: (staffId, type) => api.delete(`/api/documents/staff/${staffId}/${type}`),

  // Older helpers kept for any screen still using them.
  uploadMyPhoto: (file) =>
    api.post(
      "/api/documents/me",
      {
        type: "photo",
        data: file.data || file.base64,
        mimeType: file.mimeType || "image/jpeg",
        fileName: file.fileName || "profile.jpg",
      },
      UPLOAD,
    ),
  removeMyPhoto: () => api.delete("/api/documents/me/photo"),
};
