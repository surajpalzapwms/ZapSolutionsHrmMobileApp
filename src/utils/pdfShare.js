// src/utils/pdfShare.js
// Shared helper: turns an HTML string into a PDF on the phone (expo-print)
// and opens the share / save sheet (expo-sharing). Used by the salary slip
// and the letters. expo-print / expo-sharing are already in package.json;
// they are still loaded optionally so the app bundles even if missing.
import { Alert } from "react-native";
import { formatMoneyZero } from "./format";
import { companyName } from "./tenant";

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

// Company of the logged-in account (was hard-coded "ZAP Solutionz").
export const getCompanyName = () => companyName();

export const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const inr = (v) =>
  formatMoneyZero(v);

export const longDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
};

/**
 * Download a PDF the SERVER made (e.g. /api/hrm/letters/offer/download) with
 * the login token and save it as `fileName` in the cache. Returns the local
 * uri; throws with the server's own message when it refused.
 */
export async function fetchRemotePdf(path, fileName) {
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
  if (!res || res.status !== 200) {
    // The server answers errors as JSON ({ message }) — show that text.
    let message = "";
    try {
      const body = await fs.readAsStringAsync(res.uri);
      message = JSON.parse(body)?.message || "";
    } catch {
      message = "";
    }
    await fs.deleteAsync(to, { idempotent: true }).catch(() => {});
    throw new Error(message || `Download failed (${res?.status || "no response"})`);
  }
  return res.uri;
}

/** Open the share / save sheet for a PDF already on the phone. */
export async function shareLocalPdf(uri, fileName) {
  if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: fileName });
  }
  return uri;
}

/**
 * Show a PDF on screen. Uses the system print preview, which draws the real
 * PDF pages (so the letter looks exactly like the website's). Falls back to
 * the share sheet (opens in any PDF viewer) if printing isn't available.
 */
export async function openPdfPreview(uri, fileName) {
  if (Print?.printAsync) {
    try {
      await Print.printAsync({ uri });
      return uri;
    } catch {
      // fall through to the share sheet
    }
  }
  return shareLocalPdf(uri, fileName);
}

/** Download a server PDF and open the share / save sheet. */
export async function shareRemotePdf(path, fileName) {
  const uri = await fetchRemotePdf(path, fileName);
  await shareLocalPdf(uri, fileName);
  return uri;
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
