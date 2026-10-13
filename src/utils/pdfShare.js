// src/utils/pdfShare.js
// Shared helper: turns an HTML string into a PDF on the phone (expo-print)
// and opens the share / save sheet (expo-sharing). Used by the salary slip
// and the letters. expo-print / expo-sharing are already in package.json;
// they are still loaded optionally so the app bundles even if missing.
import { Alert } from "react-native";

let Print = null;
let Sharing = null;
try {
  Print = require("expo-print");
} catch {
  Print = null;
}
try {
  Sharing = require("expo-sharing");
} catch {
  Sharing = null;
}

let FileSystem = null;
try {
  FileSystem = require("expo-file-system");
} catch {
  FileSystem = null;
}
let FileSystemLegacy = null;
try {
  FileSystemLegacy = require("expo-file-system/legacy");
} catch {
  FileSystemLegacy = null;
}

// expo-print saves the PDF under a random name ("a1b2c3….pdf"). Copy it to
// the name we want (e.g. "Suraj_Pal_October_2026.pdf") so that is the name
// people see when they save or send it. Falls back to the original file.
async function renamePdf(uri, fileName) {
  const safe = String(fileName || "document.pdf").replace(/[^\w.-]+/g, "_");
  try {
    if (FileSystem?.File && FileSystem?.Paths) {
      const target = new FileSystem.File(FileSystem.Paths.cache, safe);
      if (target.exists) target.delete();
      new FileSystem.File(uri).copy(target);
      return target.uri;
    }
  } catch {
    // try the older API below
  }
  try {
    const fs = FileSystemLegacy?.copyAsync ? FileSystemLegacy : FileSystem?.copyAsync ? FileSystem : null;
    if (fs?.cacheDirectory) {
      const to = `${fs.cacheDirectory}${safe}`;
      await fs.deleteAsync(to, { idempotent: true });
      await fs.copyAsync({ from: uri, to });
      return to;
    }
  } catch {
    // keep the original name
  }
  return uri;
}

export const COMPANY_NAME = "ZAP Solutionz";

export const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const inr = (v) =>
  `₹${(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const longDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
};

/**
 * Download a PDF the SERVER made (e.g. /api/hrm/letters/offer/download) with
 * the login token, save it as `fileName` and open the share / save sheet.
 * Returns the local uri, or throws if it could not be downloaded.
 */
export async function shareRemotePdf(path, fileName) {
  const { BACKEND_URL } = require("./constants");
  const { getAuthTokenSync } = require("./authToken");
  const fs = FileSystemLegacy?.downloadAsync ? FileSystemLegacy : FileSystem?.downloadAsync ? FileSystem : null;
  if (!fs?.cacheDirectory) throw new Error("File download is not available on this phone.");
  const safe = String(fileName || "document.pdf").replace(/[^\w.-]+/g, "_");
  const to = `${fs.cacheDirectory}${safe}`;
  await fs.deleteAsync(to, { idempotent: true }).catch(() => {});
  const url = `${String(BACKEND_URL).replace(/\/+$/, "")}${path}`;
  const token = getAuthTokenSync();
  const res = await fs.downloadAsync(url, to, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res || res.status !== 200) throw new Error(`Download failed (${res?.status || "no response"})`);
  if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(res.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: fileName });
  }
  return res.uri;
}

export async function sharePdf(html, fileName) {
  if (!Print?.printToFileAsync) {
    Alert.alert("PDF not available", "PDF download needs expo-print. Run: npx expo install expo-print expo-sharing");
    return null;
  }
  // A4 portrait in points (595 × 842) — matches the salary slip template.
  const printed = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const uri = await renamePdf(printed.uri, fileName);
  if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: fileName,
    });
  } else {
    // No share sheet: system print dialog (has "Save as PDF").
    await Print.printAsync({ html });
  }
  return uri;
}
