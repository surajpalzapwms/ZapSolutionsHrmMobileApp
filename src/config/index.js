import { Platform } from "react-native";


const USE_PROD = false;
const PROD_URL = "https://zapsolutionshrmsystem.onrender.com";

const DEV_URL = Platform.select({
  android: "http://10.0.2.2:5000",
  ios: "http://localhost:5000",
  default: "http://localhost:5000",
});

export const API_URL = USE_PROD ? PROD_URL : DEV_URL;

export const TOKEN_KEY = "hrm_token";
