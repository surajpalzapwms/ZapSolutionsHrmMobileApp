import AsyncStorage from '@react-native-async-storage/async-storage';

// Metro/Expo inline EXPO_PUBLIC_* vars into `process.env` at build time, but
// @types/node isn't installed in this project, so TS doesn't know `process`
// exists. This ambient declaration just satisfies the type checker.
declare const process: { env: Record<string, string | undefined> };

// ── Base URL ────────────────────────────────────────────────────────────────
// Your phone can't reach "localhost" — that means the phone itself, not your
// PC. Point this at your computer's LAN IP (the same one Expo prints as
// "Metro: exp://192.168.x.x:8081") plus the backend's port (5000 by default).
// Set it in a .env file at the project root as:
//   EXPO_PUBLIC_API_URL=http://192.168.1.12:5000
// Expo automatically inlines any EXPO_PUBLIC_ variable at build time.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5000';

const TOKEN_KEY = 'hrm_auth_token';
const USER_KEY = 'hrm_auth_user';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'user';
};

export async function saveSession(token: string, user: AuthUser) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

// Thin wrapper around fetch: attaches the JWT, sets JSON headers, and turns
// non-2xx responses into thrown errors with the backend's own message so
// callers can just try/catch and show err.message.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }

  return body as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export function login(email: string, password: string) {
  return request<{ success: boolean; data: AuthUser & { token: string } }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ── Attendance ──────────────────────────────────────────────────────────────
export type AttendanceRecord = {
  loginTime: string | null;
  logoutTime: string | null;
} | null;

export function getMyTodayAttendance() {
  return request<{ success: boolean; attendance: AttendanceRecord }>(
    '/api/hrm/leaves/attendance/me/today',
  );
}

export function clockIn() {
  return request<{ success: boolean; message: string; attendance: AttendanceRecord }>(
    '/api/hrm/leaves/attendance/checkin',
    { method: 'POST' },
  );
}

export function clockOut() {
  return request<{ success: boolean; message: string; attendance: AttendanceRecord }>(
    '/api/hrm/leaves/attendance/checkout',
    { method: 'POST' },
  );
}

export type TodayAttendanceEntry = {
  _id: string;
  loginTime: string;
  logoutTime: string | null;
  userId: { _id: string; name: string; role: string } | string | null;
};

export function getTodayAttendanceList() {
  return request<{ success: boolean; count: number; records: TodayAttendanceEntry[] }>(
    '/api/hrm/attendance/today',
  );
}

export type MonthAttendanceEntry = {
  date: string; // "YYYY-MM-DD"
  loginTime: string | null;
  logoutTime: string | null;
  status?:
    | 'present'
    | 'absent'
    | 'leave'
    | 'holiday'
    | 'weekend'
    | 'half-day'
    | 'swap-leave'
    | 'paid-leave'
    | 'unpaid-leave';
};

export function getMyAttendanceMonth(year: number, month: number) {
  return request<{ success: boolean; records: MonthAttendanceEntry[] }>(
    `/api/hrm/leaves/attendance/me/month?year=${year}&month=${month}`,
  );
}

// ── Analytics ───────────────────────────────────────────────────────────────
export type StaffSummaryEntry = {
  name?: string;
  staffName?: string;
  presentDays?: number;
  present?: number;
  absentDays?: number;
  lateHours?: number;
};

export function getStaffSummary() {
  return request<{ success: boolean; data: StaffSummaryEntry[] }>(
    '/api/hrm/leaves/staff-summary',
  );
}

// ── Leave requests (used on the Activity tab) ──────────────────────────────
export type LeaveRequest = {
  _id: string;
  fromDate: string;
  toDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  leaveType?: string;
};

export function getMyLeaveRequests() {
  return request<{ success: boolean; data: LeaveRequest[] }>(
    '/api/hrm/leaves/requests/my',
  );
}

export type PayrollAllowance = { type: string; amount: number };
export type PayrollDeduction = { type: string; amount: number };

export type PayrollRecord = {
  _id: string;
  period: string; // "YYYY-MM"
  basicSalary: number;
  adjustedBasicSalary?: number;
  allowances: PayrollAllowance[];
  totalAllowance: number;
  deductions: PayrollDeduction[];
  totalDeduction: number;
  advanceDeduction?: number;
  netSalary: number;
  netSalaryExact?: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  paymentDate?: string | null;
  employeeId?: { _id: string; staffName?: string; email?: string } | string | null;
};

export function getMyPayrolls() {
  return request<{ success: boolean; data: PayrollRecord[] }>('/api/hrm/payroll');
}

// GET /api/hrm/payroll/:id/payslip-export — streams back a PDF (not JSON),
// so this bypasses the request() helper and returns the raw file bytes as a
// base64 string, ready to hand to expo-file-system.
// Add this function to your api.ts file
export async function downloadPayslipPdf(payrollId: string): Promise<string> {
  const token = await getToken();

  const response = await fetch(`${API_URL}/api/hrm/payroll/${payrollId}/payslip-export`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Accept': 'application/pdf',
    },
  });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.message || message;
    } catch {
      // Response wasn't JSON
    }
    throw new Error(message);
  }

  // Get the response as an ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();
  
  // Convert ArrayBuffer to base64
  const base64 = arrayBufferToBase64(arrayBuffer);
  
  return base64;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}