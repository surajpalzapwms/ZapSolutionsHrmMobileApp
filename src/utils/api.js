// src/utils/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "./constants";

// Logged once on startup so you can see in the Metro/terminal logs exactly
// which URL the app is trying to reach.
console.log("[api] BACKEND_URL =", BACKEND_URL);

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

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[api] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log(`[api] ← ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      // Request reached the backend — backend responded, just with an error
      // status (e.g. 400/401/404/500). This means connectivity is fine.
      console.log(
        `[api] ← ${error.response.status} ${error.config?.url}`,
        error.response.data
      );
      if (error.response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("myProfile");
        onUnauthorized();
      }
    } else if (error.request) {
      // Request was sent but no response ever came back — backend never
      // reached (wrong IP/port, phone+PC on different Wi-Fi, backend not
      // running, firewall blocking the port, etc.)
      console.log(
        `[api] ✗ No response from ${error.config?.baseURL}${error.config?.url}. ` +
          `Check: same Wi-Fi, correct IP/port, backend running, firewall.`
      );
    } else {
      console.log("[api] ✗ Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export const get = (url, params) => api.get(url, { params });
export const post = (url, data) => api.post(url, data);
export const put = (url, data) => api.put(url, data);
export const patch = (url, data) => api.patch(url, data);
export const del = (url, data) => api.delete(url, { data });

export default api;
