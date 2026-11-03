// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setOnCompanyInvalid, setOnUnauthorized } from "../utils/api";
import { staffService } from "../services/staffService";
import { documentService } from "../services/documentService";
import { hasLeftOrganization } from "../utils/staffStatus";
import { unregisterPresenceTask } from "../presence/backgroundPresence";
import { setAuthToken } from "../utils/authToken";
import { clearPhotoStore, loadPhotoForUser, setMyLocalPhoto } from "../utils/photoStore";
import { clearAppCaches } from "../utils/appCache";
import {
  buildTenant,
  getTenant,
  loadStoredTenant,
  setSuperAdminSession,
  setTenant,
  subscribeTenant,
} from "../utils/tenant";

const AuthContext = createContext(null);

// Super admin: "a company was picked from the list" (so the app reopens on that
// company's dashboard). Cleared on every new login and on logout, so a fresh
// login always starts at the company list - same as the website.
const PICKED_KEY = "superCompanyPicked";

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
  // Shown on the Login screen when the server ended the session because the
  // account was disabled by an admin.
  const [sessionNotice, setSessionNotice] = useState("");
  // Company + country of the logged-in account (code, name, currency, time
  // zone, logo…). Everything company-specific on screen comes from this.
  const [tenant, setTenantState] = useState(getTenant());
  useEffect(() => subscribeTenant(setTenantState), []);
  // Super admin only: has a company been picked from the company list?
  const [companyPicked, setCompanyPicked] = useState(false);
  // Company the super admin just came back from (highlighted in the list) and a
  // notice when the opened company disappeared.
  const [lastCompanyId, setLastCompanyId] = useState(null);
  const [companyNotice, setCompanyNotice] = useState("");
  // The account's own profile photo (the super admin has no Staff record).
  // undefined = not loaded yet -> the photo from the login / /me answer is used.
  const [accountPhotoUrl, setAccountPhotoUrl] = useState(undefined);

  const logout = useCallback(async () => {
    await unregisterPresenceTask();
    setAuthToken(null);
    clearPhotoStore();
    clearAppCaches();
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("myProfile");
    await AsyncStorage.removeItem(PICKED_KEY);
    await setTenant(null);
    setSuperAdminSession(false);
    setCompanyPicked(false);
    setLastCompanyId(null);
    setCompanyNotice("");
    setAccountPhotoUrl(undefined);
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
      // Server says explicitly "no photo" (e.g. removed by admin) → drop the
      // copy saved on this phone too.
      if (fresh && "photoUrl" in fresh && !fresh.photoUrl) setMyLocalPhoto(null);
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
      if (isSuperAdminRole(freshUser?.role)) {
        // The super admin belongs to no company: the one they PICK from the list is
        // the tenant, not whatever /me happens to return. /me answers with the
        // company named by X-Company-Id, so it only refreshes the picked one
        // (logo / colours / currency) - and tells us if it no longer exists.
        setSuperAdminSession(true);
        const picked = getTenant();
        if (picked?.companyId) {
          if (freshUser.company?._id && String(freshUser.company._id) === String(picked.companyId)) {
            await setTenant(buildTenant(freshUser, picked));
          } else {
            clearAppCaches();
            await setTenant(null);
            await AsyncStorage.removeItem(PICKED_KEY);
            setCompanyPicked(false);
          }
        }
      } else {
        setSuperAdminSession(false);
        // The server decides the company: if /me names a different company than
        // this phone has stored, the phone follows the server and drops the old data.
        const fresh = buildTenant(freshUser, getTenant() || {});
        const before = getTenant();
        if (before && before.companyId !== fresh.companyId) clearAppCaches();
        await setTenant(fresh);
      }
      setUser(freshUser);
      await AsyncStorage.setItem("user", JSON.stringify(freshUser));
    } catch (error) {
      await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // The user types only email / Staff ID + password. The server finds the
  // company (Staff ID prefix such as ZS / TB, or the email) and its country, and
  // answers with the company's own details (name, country, currency, logo…).
  const login = useCallback(async (identifier, password) => {
    try {
      // Sent exactly as typed (trimmed): the server works out the company from it.
      const email = String(identifier || "").trim();
      // client: "mobile" → a long-lived session, so background attendance keeps
      // working without the user having to log in again every week.
      const response = await api.post("/api/auth/login", { email, password, client: "mobile" });
      // Backend responds with { success, message, data: { id, name, email, role, token } }
      const payload = response.data?.data || response.data;
      const { token: newToken, ...rawUser } = payload;
      const userInfo = normalizeUser(rawUser);
      // Never let the previous account's data stay behind.
      clearAppCaches();
      if (isSuperAdminRole(userInfo?.role)) {
        // Super admin: no company yet. The company list is shown first and the
        // company they tap becomes the tenant (selectCompany).
        setSuperAdminSession(true);
        await setTenant(null);
        await AsyncStorage.removeItem(PICKED_KEY);
        setCompanyPicked(false);
      } else {
        setSuperAdminSession(false);
        setCompanyPicked(false);
        await setTenant(buildTenant(userInfo));
      }
      setLastCompanyId(null);
      setCompanyNotice("");
      setAccountPhotoUrl(undefined);
      setSessionNotice("");
      setAuthToken(newToken);
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
      setAuthToken(storedToken);
      await loadStoredTenant(); // before any API call, so headers are right
      // Super admin: remember the company picked last time, and that this session
      // is a super admin's.
      try {
        const storedUser = JSON.parse((await AsyncStorage.getItem("user")) || "null");
        setSuperAdminSession(!!storedToken && isSuperAdminRole(storedUser?.role));
        setCompanyPicked((await AsyncStorage.getItem(PICKED_KEY)) === "1");
      } catch {
        // nothing saved
      }
      if (storedToken) {
        setTokenState(storedToken);
      } else {
        setLoading(false);
      }
    })();

    // If any request comes back 401, drop local session so the navigator
    // switches back to the Login screen.
    setOnUnauthorized((info) => {
      setAuthToken(null);
      clearPhotoStore();
      // Nothing of the previous account may stay on the phone (lists, birthdays, letters…).
      clearAppCaches();
      setTenant(null);
      setSuperAdminSession(false);
      setCompanyPicked(false);
      setLastCompanyId(null);
      setAccountPhotoUrl(undefined);
      AsyncStorage.removeItem(PICKED_KEY).catch(() => {});
      if (info?.message) {
        setSessionNotice(info.message);
        unregisterPresenceTask().catch?.(() => {});
      }
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

  // Photo of an account that has no Staff record (the super admin). The server keeps
  // it on the login account and returns it from the same call the staff photo uses.
  const reloadMyPhoto = useCallback(async () => {
    try {
      const res = await documentService.getMine();
      const body = res.data?.data || res.data || {};
      setAccountPhotoUrl(body.photoUrl || null);
    } catch {
      // keep the photo from the login answer
    }
  }, []);

  // Load the staff profile once we know who is logged in.
  const userId = user?.id;
  const userRole = user?.role;
  useEffect(() => {
    if (!userId) return;
    // Saved photo first (instant, works offline), then the server profile.
    // The super admin has no Staff record, so there is no profile to load - only
    // the account photo (which works before a company is opened, too).
    const isSuper = isSuperAdminRole(userRole);
    loadPhotoForUser(userId)
      .finally(isSuper ? () => {} : loadMyProfile)
      .finally(() => {
        if (isAdminRole(userRole)) reloadMyPhoto();
      });
  }, [userId, userRole, loadMyProfile, reloadMyPhoto]);

  // Super admin: a company was tapped in the list → that company's dashboard.
  const selectCompany = useCallback(async (company) => {
    const next = company ? buildTenant({ company }) : null;
    if (!next?.companyId) return;
    clearAppCaches(); // nothing of the previous company may stay on screen
    setCompanyNotice("");
    await setTenant(next);
    await AsyncStorage.setItem(PICKED_KEY, "1");
    setCompanyPicked(true);
  }, []);

  // Super admin: back to the list of all companies.
  const leaveCompany = useCallback(async (notice = "") => {
    setLastCompanyId(getTenant()?.companyId || null);
    setCompanyNotice(typeof notice === "string" ? notice : "");
    clearAppCaches();
    await setTenant(null);
    await AsyncStorage.removeItem(PICKED_KEY);
    setCompanyPicked(false);
  }, []);

  // The server says the opened company no longer exists → back to the list.
  useEffect(() => {
    setOnCompanyInvalid((info) => {
      if (!getTenant()?.companyId) return; // already on the list
      leaveCompany(info?.message || "That company is no longer available. Please pick another.");
    });
  }, [leaveCompany]);

  const isAdmin = isAdminRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  // Super admin who has not opened a company yet → show the company list.
  const needsCompany = isSuperAdmin && !(companyPicked && tenant?.companyId);
  const myPhotoUrl =
    myProfile?.photoUrl || (accountPhotoUrl !== undefined ? accountPhotoUrl : user?.photoUrl) || null;
  const hasLeft = !isAdmin && hasLeftOrganization(myProfile);
  // Super admin looking at a CLIENT company (not their own owner company): VIEW ONLY.
  // Follows the opened company, so it flips the moment another one is picked.
  const isViewOnly = isSuperAdmin && !!tenant?.companyId && tenant.isOwner !== true;
  // "staff.add", "payroll.add" ... are write actions: never for view-only (same as the website).
  const canAccess = useCallback(
    (tabKey) => {
      if (isViewOnly && String(tabKey || "").includes(".")) return false;
      return hasTabAccess(user, tabKey);
    },
    [user, isViewOnly],
  );

  // Memoised: screens re-render only when something they use changes
  // (a new object on every render made EVERY screen re-render).
  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin,
      isSuperAdmin,
      isViewOnly,
      needsCompany,
      selectCompany,
      leaveCompany,
      lastCompanyId,
      companyNotice,
      myPhotoUrl,
      reloadMyPhoto,
      tenant,
      canAccess,
      myProfile,
      profileLoading,
      reloadMyProfile: loadMyProfile,
      // Staff member whose relieving date has passed. Admin accounts are never
      // treated as "left" here — they still manage the app.
      hasLeft,
      sessionNotice,
      login,
      logout,
      token,
    }),
    [
      user,
      loading,
      isAdmin,
      isSuperAdmin,
      isViewOnly,
      needsCompany,
      selectCompany,
      leaveCompany,
      lastCompanyId,
      companyNotice,
      myPhotoUrl,
      reloadMyPhoto,
      tenant,
      canAccess,
      myProfile,
      profileLoading,
      loadMyProfile,
      hasLeft,
      sessionNotice,
      login,
      logout,
      token,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
