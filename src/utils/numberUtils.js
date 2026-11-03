// src/utils/numberUtils.js
import { getTenant } from "./tenant";
import { getCountry } from "../config/tenants";
export const formatCurrency = (amount) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === null || num === undefined) return "$0.00";
  const country = getCountry(getTenant()?.country);
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: getTenant()?.currency || country.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const parseCurrency = (value) => {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
};

export const formatNumber = (num, decimals = 2) => {
  if (isNaN(num) || num === null || num === undefined) return "0";
  return Number(num).toFixed(decimals);
};

export const isNumeric = (value) => {
  return /^\d*\.?\d*$/.test(value);
};