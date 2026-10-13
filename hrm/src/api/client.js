import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COMPANIES = require("../config/companies");
export const companyKey = Constants.expoConfig?.extra?.company || "acme";
export const BASE_URL = COMPANIES[companyKey].apiUrl;

// Set USE_MOCK=false when your real backend is ready.
const USE_MOCK = true;

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
}

export async function login(email, password) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { token: "mock-token", user: { name: "Rahul Patil", role: "Employee" } };
  }
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

// Same endpoint the website uses: GET /api/company/branding -> { success, data: { name, logoUrl, primaryColor, sidebarColor, ... } }
export async function getCompanyProfile() {
  if (USE_MOCK) {
    return {
      name: companyKey === "acme" ? "Acme Industries Pvt Ltd" : "Globex Corporation",
      logoUrl: null, // put a real https URL here, e.g. https://cdn.yourapi.com/acme-logo.png
    };
  }
  const res = await request("/api/company/branding");
  return res.data;
}

// Data is automatically company-wise because BASE_URL / token belong to that company.
export async function getEmployees() {
  if (USE_MOCK) {
    return [
      { id: 1, name: "Rahul Patil", dept: "Engineering" },
      { id: 2, name: "Sneha Kulkarni", dept: "HR" },
      { id: 3, name: "Amit Shah", dept: "Finance" },
    ];
  }
  return request("/api/staff");
}
