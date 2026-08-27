import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_KEY } from "../config";
import { setUnauthorizedHandler } from "../api/client";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true); // restoring session on launch

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Global 401 -> drop the session.
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  // Restore a saved session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          const me = await authApi.getMe();
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      if (!data?.token) return { success: false, error: "Login failed" };
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        permissions: data.permissions,
      });
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e.response?.data?.message || "Login failed",
      };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, booting, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
