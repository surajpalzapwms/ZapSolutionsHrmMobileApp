// src/utils/filePick.js — choose a photo (camera / gallery) or a PDF and
// return it ready for upload: { data (base64), mimeType, fileName }.
// The picker modules are loaded optionally so the app still bundles before
// `npx expo install expo-image-picker expo-image-manipulator expo-document-picker expo-file-system`.
import { Alert } from "react-native";

let ImagePicker = null;
let ImageManipulator = null;
let DocumentPicker = null;
let FileSystem = null;
let FileSystemLegacy = null;
try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}
try {
  ImageManipulator = require("expo-image-manipulator");
} catch {
  ImageManipulator = null;
}
try {
  DocumentPicker = require("expo-document-picker");
} catch {
  DocumentPicker = null;
}
try {
  FileSystem = require("expo-file-system");
} catch {
  FileSystem = null;
}
try {
  FileSystemLegacy = require("expo-file-system/legacy");
} catch {
  FileSystemLegacy = null;
}

const MAX_BYTES = 8 * 1024 * 1024;

const missing = (what) => {
  Alert.alert(
    "Not available",
    `${what} needs an app update. Run: npx expo install expo-image-picker expo-image-manipulator expo-document-picker expo-file-system, then rebuild the app.`,
  );
  return null;
};

const guessImageType = (asset) => {
  const t = String(asset.mimeType || "").toLowerCase();
  if (t.startsWith("image/")) return t === "image/jpg" ? "image/jpeg" : t;
  const name = String(asset.fileName || asset.uri || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

// Convert any picked photo (HEIC / PNG / WEBP / huge camera JPEG) into a
// small JPEG: profile photo 512×512, documents max 1600 px wide. Small
// JPEGs upload fast, show on every phone and the website, and load
// quickly in lists. Returns { base64, uri } or null if conversion isn't
// available (then the picker's own JPEG output is used).
async function toJpeg(uri, { square }) {
  if (!ImageManipulator || !uri) return null;
  const width = square ? 512 : 1600;
  const save = { compress: square ? 0.75 : 0.7, format: ImageManipulator.SaveFormat?.JPEG || "jpeg", base64: true };
  try {
    if (ImageManipulator.ImageManipulator?.manipulate) {
      const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
      ctx.resize(square ? { width, height: width } : { width });
      const ref = await ctx.renderAsync();
      const out = await ref.saveAsync(save);
      return out?.base64 ? { base64: out.base64, uri: out.uri } : null;
    }
    if (ImageManipulator.manipulateAsync) {
      const out = await ImageManipulator.manipulateAsync(uri, [{ resize: square ? { width, height: width } : { width } }], save);
      return out?.base64 ? { base64: out.base64, uri: out.uri } : null;
    }
  } catch {
    // fall back to the picker output
  }
  return null;
}

/**
 * Pick an image from the camera or the gallery.
 * Always returns a JPEG: { data (base64), mimeType: "image/jpeg", fileName,
 * previewUri, dataUri }.
 * @param {{ camera?: boolean, square?: boolean }} opts
 */
export async function pickImage({ camera = false, square = false } = {}) {
  if (!ImagePicker) return missing("Choosing a photo");
  const perm = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", camera ? "Allow camera access to take a photo." : "Allow photo access to choose a photo.");
    return null;
  }
  const options = {
    mediaTypes: ["images"],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 0.8,
    // Only ask the picker for base64 when we can't convert ourselves
    // (base64 of a full-size photo is slow and memory-heavy).
    base64: !ImageManipulator,
  };
  const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];

  const jpeg = await toJpeg(asset.uri, { square });
  let data = jpeg?.base64 || asset.base64;
  if (!data && asset.uri) {
    try {
      data = await readBase64(asset.uri);
    } catch {
      data = null;
    }
  }
  if (!data) {
    Alert.alert("Couldn't read photo", "Please try another photo.");
    return null;
  }
  if (data.length * 0.75 > MAX_BYTES) {
    Alert.alert("Photo too large", "Please choose a smaller photo (max 8 MB).");
    return null;
  }
  // Without the converter the original type is kept (rare: old builds).
  const mimeType = jpeg ? "image/jpeg" : guessImageType(asset);
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const base = String(asset.fileName || `photo_${Date.now()}`).replace(/\.[^.]+$/, "");
  return {
    data,
    mimeType,
    fileName: `${base}.${ext}`,
    previewUri: jpeg?.uri || asset.uri,
    dataUri: `data:${mimeType};base64,${data}`,
  };
}

async function readBase64(uri) {
  if (FileSystem?.File) {
    const f = new FileSystem.File(uri);
    if (typeof f.base64 === "function") return await f.base64();
    if (typeof f.base64Sync === "function") return f.base64Sync();
  }
  if (FileSystemLegacy?.readAsStringAsync) {
    return FileSystemLegacy.readAsStringAsync(uri, { encoding: "base64" });
  }
  if (FileSystem?.readAsStringAsync) {
    return FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  }
  throw new Error("expo-file-system missing");
}

/** Pick a PDF file. */
export async function pickPdf() {
  if (!DocumentPicker || (!FileSystem && !FileSystemLegacy)) return missing("Choosing a PDF");
  const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (asset.size && asset.size > MAX_BYTES) {
    Alert.alert("File too large", "Please choose a PDF smaller than 8 MB.");
    return null;
  }
  const data = await readBase64(asset.uri);
  return { data, mimeType: "application/pdf", fileName: asset.name || "document.pdf" };
}
