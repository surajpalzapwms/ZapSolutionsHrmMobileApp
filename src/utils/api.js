// src/utils/api.js
import axios from "axios";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "./constants";
import { getAuthToken, setAuthToken } from "./authToken";
import { getTenant, isCompanyViewOnly, isSuperAdminSession, onlyMyCompany } from "./tenant";

// Request logs only while developing — logging every call slows release builds.
const log = __DEV__ ? console.log : () => {};

// Logged once on startup so you can see in the Metro/terminal logs exactly
// which URL the app is trying to reach.
log("[api] BACKEND_URL =", BACKEND_URL);

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Called by AuthContext on logout/401 so screens can react (e.g. navigate
// back to Login) without this file needing to know about navigation.
let onUnauthorized = () => {};
export const setOnUnauthorized = (handler) => {
  onUnauthorized = handler;
};

// Super admin: the company they opened is gone / invalid → AuthContext sends them
// back to the company list (they are NOT signed out).
let onCompanyInvalid = () => {};
export const setOnCompanyInvalid = (handler) => {
  onCompanyInvalid = handler;
};
const COMPANY_GONE_CODES = new Set(["COMPANY_NOT_FOUND", "COMPANY_INVALID", "COMPANY_REQUIRED"]);

// The server answers 403 + one of these codes once an admin has DISABLED the
// account (or the staff member has left). The phone must stop showing that
// person's data straight away — same as a 401.
// COMPANY_INACTIVE / COMPANY_MISSING = the company was switched off (or the login
// is not linked to one) → sign out and show the server's message.
// COMPANY_MISMATCH = the token belongs to a different company than the phone thinks.
const ACCOUNT_BLOCKED_CODES = new Set([
  "STAFF_INACTIVE",
  "STAFF_RELIEVED",
  "COMPANY_MISMATCH",
  "COMPANY_INACTIVE",
  "COMPANY_MISSING",
]);

// Super admin inside a CLIENT company is view only (the company's own admin adds and
// edits its records). Every write is stopped here so a half-filled form is not lost
// silently — the server refuses it too (403 CLIENT_COMPANY_READ_ONLY). Company
// management (/api/company/...), the login/session calls and the super admin's own
// profile photo are NOT company data, so they stay allowed (same list as the server).
export const VIEW_ONLY_MESSAGE = "View only — this company's admin adds and edits its own details.";
const READ_METHODS = new Set(["get", "head", "options"]);
const WRITE_ALWAYS_OK = /^\/?api\/(company|auth)(\/|$)|^\/?api\/documents\/me(\/|$)/;
const isBlockedForViewOnly = (config) => {
  if (!isCompanyViewOnly()) return false;
  if (READ_METHODS.has(String(config.method || "get").toLowerCase())) return false;
  const path = String(config.url || "").replace(/^https?:\/\/[^/]+/, "");
  return !WRITE_ALWAYS_OK.test(path);
};

api.interceptors.request.use(
  async (config) => {
    if (isBlockedForViewOnly(config)) {
      Alert.alert("View only", VIEW_ONLY_MESSAGE);
      return Promise.reject(
        Object.assign(new Error("View only"), {
          response: { status: 403, data: { code: "CLIENT_COMPANY_READ_ONLY", message: VIEW_ONLY_MESSAGE } },
        }),
      );
    }
    const token = await getAuthToken(); // memory, not storage, on every call
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Tell the server which company / country this phone is logged in to.
    // The server must still take the company from the TOKEN and reject a
    // mismatch — these headers are a hint + a mismatch check, not the lock.
    const tenant = getTenant();
    if (tenant?.companyCode) {
      config.headers["X-Company-Code"] = tenant.companyCode;
      config.headers["X-Country"] = tenant.country;
    }
    // Super admin: THE company they opened. (For admins and staff the server always
    // uses their own company from the login and ignores this header.)
    if (tenant?.companyId) {
      config.headers["X-Company-Id"] = tenant.companyId;
    }
    log(`[api] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    log(`[api] ← ${response.status} ${response.config.url}`);
    // Safety net: drop any row tagged with another company's code.
    const body = response.data;
    if (Array.isArray(body)) response.data = onlyMyCompany(body);
    else if (body && Array.isArray(body.data)) body.data = onlyMyCompany(body.data);
    return response;
  },
  async (error) => {
    if (error.response) {
      // Request reached the backend — backend responded, just with an error
      // status (e.g. 400/401/404/500). This means connectivity is fine.
      log(
        `[api] ← ${error.response.status} ${error.config?.url}`,
        error.response.data
      );
      const status = error.response.status;
      const code = error.response.data?.code;
      const isLoginCall = String(error.config?.url || "").includes("/api/auth/login");
      // A super admin whose opened company no longer exists goes back to the list.
      const superCompanyGone = isSuperAdminSession() && COMPANY_GONE_CODES.has(code);
      if (superCompanyGone) onCompanyInvalid({ message: error.response.data?.message });
      const accountBlocked = status === 403 && ACCOUNT_BLOCKED_CODES.has(code) && !isLoginCall && !superCompanyGone;
      if (status === 401 || accountBlocked) {
        setAuthToken(null);
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("myProfile");
        onUnauthorized(
          accountBlocked
            ? {
                message:
                  error.response.data?.message ||
                  (code === "COMPANY_MISMATCH"
                    ? "Your session belongs to a different company. Please sign in again."
                    : "You are not allowed to login because admin has deactivated you."),
              }
            : undefined,
        );
      }
    } else if (error.request) {
      // Request was sent but no response ever came back — backend never
      // reached (wrong IP/port, phone+PC on different Wi-Fi, backend not
      // running, firewall blocking the port, etc.)
      log(
        `[api] ✗ No response from ${error.config?.baseURL}${error.config?.url}. ` +
          `Check: same Wi-Fi, correct IP/port, backend running, firewall.`
      );
    } else {
      log("[api] ✗ Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export const get = (url, params) => api.get(url, { params });
export const post = (url, data) => api.post(url, data);
export const put = (url, data) => api.put(url, data);
export const patch = (url, data) => api.patch(url, data);
export const del = (url, data) => api.delete(url, { data });

// Photos / documents come back from the server as relative links
// ("/api/documents/photo/…"). Turn one into a full URL for <Image> / the browser.
export const fileUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|file:|data:)/i.test(path)) return path;
  return `${String(BACKEND_URL || "").replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default api;
