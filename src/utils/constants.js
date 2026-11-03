// src/utils/constants.js
import Constants from "expo-constants";

export const ALLOWANCE_TYPES = [
  "House Rent Allowance",
  "Dearness Allowance",
  "Conveyance Allowance",
  "Medical Allowance",
  "Special Allowance",
  "Travel Allowance",
  "Bonus",
  "Overtime",
  "Incentive",
  "Other",
];

export const PAYROLL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  PAID: "paid",
};

export const LEAVE_TYPES = {
  PAID: "paid",
  UNPAID: "unpaid",
  SWAP: "swapleave",
};

export const ATTENDANCE_TYPES = {
  FULL: "full",
  HALF: "half",
  SHORT: "short",
};

export const ADVANCE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  REPAID: "repaid",
};

export const ITEMS_PER_PAGE = {
  HOLIDAYS: 10,
  PAYROLL: 10,
  STAFF: 10,
  ATTENDANCE: 10,
  ADVANCE: 10,
  STAFF_BASIC_PAYROLL: 11,
  OFFICE_EXPENSE: 10,
};

// Backend URL: set EXPO_PUBLIC_BACKEND_URL in .env (production by default).
// Fallback is expo.extra.apiUrl in app.json.
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "https://hrm.zapsolutionz.com";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// App name shown under the phone icon (app.json → expo.name) and on Login.
export const APP_NAME = "HRM-EOVO";
export const APP_TAGLINE = "Effective Oriented Virtual Outstanding";
