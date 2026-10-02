// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setOnUnauthorized } from "../utils/api";
import { staffService } from "../services/staffService";
import { hasLeftOrganization } from "../utils/staffStatus";
import { unregisterPresenceTask } from "../presence/backgroundPresence";

const AuthContext = createContext(null);

// /api/auth/login returns { id, ... } but /api/auth/me returns the raw
// Mongo document with `_id` — normalise so `user.id` always works.
const normalizeUser = (u) => (u ? { ...u, id: u.id || u._id } : null);
const roleOf = (role) => String(role || "").toLowerCase();
export const isAdminRole = (role) => roleOf(role) === "admin" || roleOf(role) === "super-admin";
export const isSuperAdminRole = (role) => roleOf(role) === "super-admin";

// Same rule as the website's hasTabAccess (frontend/src/utils/authUser.js):
// super admin always; a promoted admin only for tabs granted in
// `permissions` (or "Show All"); a plain "user" (staff) never.
export const hasTabAccess = (user, tabKey) => {
  const role = roleOf(user?.role);
  if (role === "super-admin") return true;
  if (role !== "admin") return false;
  const perms = user?.permissions || {};
  if (perms.allTabs) return true;
  return Array.isArray(perms.tabs) && perms.tabs.includes(tabKey);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  // Logged-in account's own Staff record (joining / relieving dates, status,
  // Staff _id used for payroll / advances / settlement). Admin accounts may
  // have none — that's fine, it just stays null.
  const [myProfile, setMyProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const logout = useCallback(async () => {
    await unregisterPresenceTask();
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("myProfile");
    setTokenState(null);
    setUser(null);
    setMyProfile(null);
  }, []);

  // The last known profile is kept on the phone so screens (left the
  // organization or not, joining / relieving limits) render instantly on
  // the next app start, then it is refreshed from the server.
  const loadMyProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const cached = await AsyncStorage.getItem("myProfile");
      if (cached) setMyProfile((prev) => prev || JSON.parse(cached));
    } catch {
      // ignore a bad cached copy
    }
    try {
      const res = await staffService.getMyProfile();
      const fresh = res.data?.data || null;
      setMyProfile(fresh);
      if (fresh) await AsyncStorage.setItem("myProfile", JSON.stringify(fresh));
      else await AsyncStorage.removeItem("myProfile");
    } catch (e) {
      // Offline / server error: keep the cached copy. Only a real "no
      // profile" answer clears it.
      if (e?.response?.status === 404) {
        setMyProfile(null);
        await AsyncStorage.removeItem("myProfile");
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get("/api/auth/me");
      const freshUser = normalizeUser(response.data?.data || response.data);
      setUser(freshUser);
      await AsyncStorage.setItem("user", JSON.stringify(freshUser));
    } catch (error) {
      await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      // Backend responds with { success, message, data: { id, name, email, role, token } }
      const payload = response.data?.data || response.data;
      const { token: newToken, ...rawUser } = payload;
      const userInfo = normalizeUser(rawUser);
      await AsyncStorage.setItem("token", newToken);
      await AsyncStorage.setItem("user", JSON.stringify(userInfo));
      setTokenState(newToken);
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      if (error.response) {
        // Backend was reached and responded (wrong password, validation
        // error, etc). Show its actual message.
        return {
          success: false,
          error: error.response.data?.message || `Login failed (status ${error.response.status})`,
        };
      }
      if (error.request) {
        // Request left the app but no response ever came back — the
        // backend was never reached.
        return {
          success: false,
          error:
            "Can't reach the server. Check that your backend is running, your phone is on the same Wi-Fi as your PC, and the IP/port in .env is correct.",
        };
      }
      return { success: false, error: error.message || "Login failed" };
    }
  }, []);

  // Bootstrap on app start: restore token from storage, then verify with /me.
  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setTokenState(storedToken);
      } else {
        setLoading(false);
      }
    })();

    // If any request comes back 401, drop local session so the navigator
    // switches back to the Login screen.
    setOnUnauthorized(() => {
      setTokenState(null);
      setUser(null);
      setMyProfile(null);
    });
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  // Load the staff profile once we know who is logged in.
  const userId = user?.id;
  useEffect(() => {
    if (userId) loadMyProfile();
  }, [userId, loadMyProfile]);

  const isAdmin = isAdminRole(user?.role);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isSuperAdmin: isSuperAdminRole(user?.role),
    canAccess: (tabKey) => hasTabAccess(user, tabKey),
    myProfile,
    profileLoading,
    reloadMyProfile: loadMyProfile,
    // Staff member whose relieving date has passed. Admin accounts are never
    // treated as "left" here — they still manage the app.
    hasLeft: !isAdmin && hasLeftOrganization(myProfile),
    login,
    logout,
    token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
