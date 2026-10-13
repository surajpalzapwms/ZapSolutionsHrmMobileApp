// src/utils/authToken.js — the login token kept in memory.
// Reading AsyncStorage on every API call and every photo was slow; this is
// filled once (login / app start) and read synchronously everywhere.
import AsyncStorage from "@react-native-async-storage/async-storage";

let token = null;
let loaded = false;

export function setAuthToken(value) {
  token = value || null;
  loaded = true;
}

export function getAuthTokenSync() {
  return token;
}

export async function getAuthToken() {
  if (!loaded) {
    try {
      token = await AsyncStorage.getItem("token");
    } catch {
      token = null;
    }
    loaded = true;
  }
  return token;
}
