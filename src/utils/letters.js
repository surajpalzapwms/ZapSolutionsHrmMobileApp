// src/utils/letters.js — the six HR letters, generated on the phone from the
// staff member's own profile (staffName, staffId, designation, department,
// date = joining date, confirmationDate, relievingDate). Plain templates:
// HR should review the wording before using them officially.
import { COMPANY_NAME, esc, longDate, sharePdf, shareRemotePdf } from "./pdfShare";

// Male -> "Mr.", Female -> "Ms." (staff profile `gender`).
export const honorific = (gender) => {
  const g = String(gender || "").toLowerCase();
  if (g === "male" || g === "m") return "Mr.";
  if (g === "female" || g === "f") return "Ms.";
  return "";
};

// These three are made by the server in the company's own letter layout
// (bands, logo, details box, salary table) — same PDF as the website.
export const SERVER_LETTERS = ["offer", "joining", "confirmation"];
import { FOOTER_IMG, HEADER_IMG, STAMP_IMG } from "./payslipAssets";

export const LETTER_TYPES = [
  { key: "joining", label: "Joining Letter", emoji: "🤝", bg: "#E0E7FF" },
  { key: "offer", label: "Offer Letter", emoji: "📨", bg: "#FCE7F3" },
  { key: "confirmation", label: "Confirmation Letter", emoji: "✅", bg: "#D1FAE5" },
  { key: "termination", label: "Termination Letter", emoji: "⛔", bg: "#FEF3C7" },
  { key: "leaving", label: "Leaving Letter", emoji: "👋", bg: "#E0E7FF" },
  { key: "experience", label: "Experience Letter", emoji: "🏅", bg: "#FCE7F3" },
];

// Returns { title, paragraphs[], missing } — `missing` is a message when the
// profile lacks a date the letter needs.
export function buildLetter(type, staff) {
  const s = staff || {};
  const name = [honorific(s.gender), s.staffName || "Employee"].filter(Boolean).join(" ");
  const g = String(s.gender || "").toLowerCase();
  const them = g.startsWith("f") ? "her" : g.startsWith("m") ? "him" : "them";
  const their = g.startsWith("f") ? "her" : g.startsWith("m") ? "his" : "their";
  const role = s.designation || s.projectName || "your position";
  const dept = s.department ? ` in the ${s.department} department` : "";
  const join = s.date ? longDate(s.date) : null;
  const conf = s.confirmationDate ? longDate(s.confirmationDate) : null;
  const rel = s.relievingDate ? longDate(s.relievingDate) : null;
  const idLine = s.staffId ? ` Your Staff ID is ${s.staffId}.` : "";
  const label = LETTER_TYPES.find((t) => t.key === type)?.label || "Letter";

  const need = (cond, msg) => (cond ? null : msg);

  switch (type) {
    case "joining":
      return {
        title: label,
        missing: need(join, "Joining date is not set on your profile — contact HR."),
        paragraphs: [
          `Dear ${name},`,
          `We are pleased to confirm your joining ${COMPANY_NAME} as ${role}${dept}, with effect from ${join}.${idLine}`,
          `You are expected to follow the company's policies, code of conduct and working hours. Your reporting manager and HR will guide you through the initial formalities.`,
          `We welcome you to the team and wish you a successful career with us.`,
        ],
      };
    case "offer":
      return {
        title: label,
        missing: need(join, "Joining date is not set on your profile — contact HR."),
        paragraphs: [
          `Dear ${name},`,
          `We are pleased to offer you the position of ${role}${dept} at ${COMPANY_NAME}. Your date of joining will be ${join}.`,
          `This offer is subject to satisfactory verification of your documents and references. Please sign and return a copy of this letter as your acceptance.`,
          `We look forward to welcoming you to ${COMPANY_NAME}.`,
        ],
      };
    case "confirmation":
      return {
        title: label,
        missing: need(conf, "Confirmation date is not set on your profile — contact HR."),
        paragraphs: [
          `Dear ${name},`,
          `We are pleased to inform you that, on completion of your probation period and based on your performance, your services as ${role} at ${COMPANY_NAME} are confirmed with effect from ${conf}.`,
          `All other terms and conditions of your employment remain unchanged.`,
          `Congratulations, and we wish you continued success.`,
        ],
      };
    case "termination":
      return {
        title: label,
        missing: need(rel, "Relieving date is not set on your profile — contact HR."),
        paragraphs: [
          `Dear ${name},`,
          `This is to inform you that your services as ${role} with ${COMPANY_NAME} stand terminated with effect from ${rel}.`,
          `You are requested to return all company property and complete the handover of your work before the date mentioned above. Your full and final settlement will be processed as per company policy.`,
        ],
      };
    case "leaving":
      return {
        title: label,
        missing: need(rel, "Relieving date is not set on your profile — contact HR."),
        paragraphs: [
          `Dear ${name},`,
          `This is to confirm that you have been relieved from your duties as ${role} at ${COMPANY_NAME} at the close of business on ${rel}.${
            join ? ` You were associated with us from ${join}.` : ""
          }`,
          `Your full and final settlement will be processed as per company policy. We thank you for your contribution and wish you the very best in your future endeavours.`,
        ],
      };
    case "experience":
      return {
        title: label,
        missing: need(join && rel, "Joining and relieving dates are needed — contact HR."),
        paragraphs: [
          `TO WHOMSOEVER IT MAY CONCERN`,
          `This is to certify that ${name}${s.staffId ? ` (Staff ID: ${s.staffId})` : ""} worked with ${COMPANY_NAME} as ${role}${dept} from ${join} to ${rel}.`,
          `During this period, ${their} conduct and work were found satisfactory. We wish ${them} all the best in ${their} future career.`,
        ],
      };
    default:
      return { title: label, paragraphs: [], missing: "Unknown letter." };
  }
}

// Date printed on the letter. Leaving / experience / termination letters
// carry the LAST WORKING DAY (relieving date), never today's date; the
// others use their own date, or the day HR generated the letter.
export function letterDateOf(type, staff, issuedAt) {
  const s = staff || {};
  if (["leaving", "experience", "termination"].includes(type) && s.relievingDate) return s.relievingDate;
  if (type === "confirmation" && s.confirmationDate) return s.confirmationDate;
  if (type === "joining" && s.date) return s.date;
  return issuedAt || new Date();
}

// A4 letter on the same ZAP Solutionz letterhead as the salary slip
// (header logos + gold rule, footer corner art + partner logos, stamp).
export function buildLetterHtml(type, staff, issuedAt) {
  const { title, paragraphs } = buildLetter(type, staff);
  const body = paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: "Noto Sans", Roboto, "Open Sans", Arial, sans-serif; color: #2b2b2b; font-size: 11pt; line-height: 1.65; }
  .page { position: relative; width: 595pt; min-height: 841pt; overflow: hidden; }
  .hdr { display: block; width: 595pt; height: auto; }
  .ftr { position: absolute; left: 0; bottom: 0; width: 595pt; height: auto; z-index: 0; }
  .body { position: relative; z-index: 1; padding: 6pt 60pt 120pt; }
  .meta { display: flex; justify-content: space-between; font-size: 10pt; color: #444; margin-bottom: 14pt; }
  h2 { text-align: center; font-size: 13pt; font-weight: 800; letter-spacing: 0.4pt; color: #0c3754; margin: 4pt 0 18pt; }
  p { margin: 0 0 11pt; text-align: justify; }
  .sign { position: relative; margin-top: 34pt; }
  .sign p { text-align: left; }
  .stamp { position: absolute; left: 190pt; top: -6pt; width: 84pt; height: 84pt; }
</style></head><body>
<div class="page">
  <img class="hdr" src="${HEADER_IMG}"/>
  <img class="ftr" src="${FOOTER_IMG}"/>
  <div class="body">
    <div class="meta"><span>${staff?.staffId ? `Ref: ${esc(staff.staffId)}` : ""}</span><span>Date: ${esc(longDate(letterDateOf(type, staff, issuedAt)))}</span></div>
    <h2>${esc(title.toUpperCase())}</h2>
    ${body}
    <div class="sign">
      <p>Yours sincerely,</p>
      <p><b>Authorised Signatory</b><br/>HR Department<br/>${esc(COMPANY_NAME)}</p>
      <img class="stamp" src="${STAMP_IMG}"/>
    </div>
  </div>
</div>
</body></html>`;
}

/**
 * opts.staffId — admin downloading someone else's letter.
 * Offer / Joining / Confirmation come from the server (company layout);
 * the others are still made on the phone.
 */
export async function downloadLetterPdf(type, staff, issuedAt, opts = {}) {
  const who = String(staff?.staffName || "Staff").trim().replace(/[^\w-]+/g, "_");
  const label = (LETTER_TYPES.find((t) => t.key === type)?.label || "Letter").replace(/\s+/g, "_");
  const fileName = `${who}_${label}.pdf`;
  if (SERVER_LETTERS.includes(type)) {
    const q = opts.staffId ? `?staffId=${encodeURIComponent(opts.staffId)}` : "";
    return shareRemotePdf(`/api/hrm/letters/${type}/download${q}`, fileName);
  }
  return sharePdf(buildLetterHtml(type, staff, issuedAt), fileName);
}
