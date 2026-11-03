// src/utils/letters.js — the six HR letters.
//
// ALL six letters (Offer, Joining, Confirmation, Termination, Leaving,
// Experience) are made by the SERVER from the details HR entered when
// generating them — exactly the same PDF the website shows and downloads.
// (The phone used to build Termination / Leaving / Experience itself from a
// different template, and showed its own text for the other three, so the
// app and the website didn't match.)
import { fetchRemotePdf, openPdfPreview, shareLocalPdf } from "./pdfShare";

// Male -> "Mr.", Female -> "Ms." (staff profile `gender`).
export const honorific = (gender) => {
  const g = String(gender || "").toLowerCase();
  if (g === "male" || g === "m") return "Mr.";
  if (g === "female" || g === "f") return "Ms.";
  return "";
};

export const LETTER_TYPES = [
  { key: "joining", label: "Joining Letter", emoji: "🤝", bg: "#E0E7FF" },
  { key: "offer", label: "Offer Letter", emoji: "📨", bg: "#FCE7F3" },
  { key: "confirmation", label: "Confirmation Letter", emoji: "✅", bg: "#D1FAE5" },
  { key: "termination", label: "Termination Letter", emoji: "⛔", bg: "#FEF3C7" },
  { key: "leaving", label: "Leaving Letter", emoji: "👋", bg: "#E0E7FF" },
  { key: "experience", label: "Experience Letter", emoji: "🏅", bg: "#FCE7F3" },
];

// Every letter comes from the server (company layout, same as the website).
export const SERVER_LETTERS = LETTER_TYPES.map((l) => l.key);

// Termination / Leaving / Experience carry a last working day that HR picks
// in the "Generate" form (from the resignation, or any date).
export const RELIEVING_LETTERS = ["termination", "leaving", "experience"];

export const letterLabel = (type) => LETTER_TYPES.find((t) => t.key === type)?.label || "Letter";

const fileNameFor = (type, staff) => {
  const who = String(staff?.staffName || "Staff").trim().replace(/[^\w-]+/g, "_");
  return `${who}_${letterLabel(type).replace(/\s+/g, "_")}.pdf`;
};

const pathFor = (type, staffId) =>
  `/api/hrm/letters/${type}/download${staffId ? `?staffId=${encodeURIComponent(staffId)}` : ""}`;

/**
 * Download the letter PDF and open the share / save sheet.
 * opts.staffId — admin downloading someone else's letter.
 */
export async function downloadLetterPdf(type, staff, _issuedAt, opts = {}) {
  const fileName = fileNameFor(type, staff);
  const uri = await fetchRemotePdf(pathFor(type, opts.staffId), fileName);
  await shareLocalPdf(uri, fileName);
  return uri;
}

/** Download the letter PDF and show it on screen (system PDF preview). */
export async function viewLetterPdf(type, staff, opts = {}) {
  const fileName = fileNameFor(type, staff);
  const uri = await fetchRemotePdf(pathFor(type, opts.staffId), fileName);
  await openPdfPreview(uri, fileName);
  return uri;
}
