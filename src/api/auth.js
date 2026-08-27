import api from "./client";

// Backend returns: { success, message, data: { id, name, email, role, permissions, token } }
export async function login(email, password) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data?.data; // { id, name, email, role, permissions, token }
}

// GET /api/auth/me -> { success, data: user }
export async function getMe() {
  const res = await api.get("/api/auth/me");
  return res.data?.data;
}
