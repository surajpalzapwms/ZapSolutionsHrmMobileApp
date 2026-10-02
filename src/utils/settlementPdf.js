// src/utils/settlementPdf.js
// Builds the Full & Final Settlement Statement as HTML and turns it into a
// PDF on the phone (expo-print), then opens the share sheet (expo-sharing)
// so the staff member can save it to Files / Drive or send it on.
//
// Same sections and figures as the website's Settlement Statement
// (frontend/src/components/staff/StaffSettlementModal.jsx +
// utils/settlementGenerator.js), read from the same API payload.
import { Alert, Share } from "react-native";

// expo-print / expo-sharing are loaded OPTIONALLY: if they are not installed
// yet (npx expo install expo-print expo-sharing) the app still bundles and
// runs — only the PDF download falls back (see downloadSettlementPdf).
// metro.config.js sets transformer.allowOptionalDependencies for this.
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

const COMPANY_NAME = "ZAP Solutionz";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const money = (v) =>
  `₹${(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const d2 = (n) => String(Math.round((Number(n) || 0) * 100) / 100);
const dz = (n) => (Number(n) ? d2(n) : "—");
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const fmtDate = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const row = (label, value, cls = "") =>
  `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;

const section = (title, body) =>
  `<table class="sec"><thead><tr><th colspan="2">${esc(title)}</th></tr></thead><tbody>${body}</tbody></table>`;

function ledgerHtml(lb) {
  const months = lb?.monthly || [];
  if (!months.length) return "";
  const t = lb.totals;
  const plLeft = (m) => round2(m.plAmount ?? Number(m.plRemaining) * Number(m.perDaySalary));
  const plTaken = (m) => round2(Number(m.deducted?.paid) * Number(m.perDaySalary));
  const body = months
    .map(
      (m) => `<tr>
        <td class="l">${esc(m.label)}${m.beforeConfirmation ? '<div class="muted">before confirmation</div>' : ""}${
          !m.credited && !m.beforeConfirmation ? '<div class="warn">not earned (&lt;20 days)</div>' : ""
        }</td>
        <td>${dz(m.earned?.sick)}</td><td>${dz(m.earned?.casual)}</td><td>${dz(m.earned?.paid)}</td>
        <td>${dz(m.taken?.sick)}</td><td>${dz(m.taken?.casual)}</td><td>${dz(m.taken?.paid)}</td><td><b>${dz(m.taken?.total)}</b></td>
        <td>${dz(m.deducted?.sickCasual)}</td><td>${dz(m.deducted?.paid)}</td>
        <td><b>${dz(m.plRemaining)}</b></td>
        <td>${m.perDaySalary ? money(m.perDaySalary) : "—"}</td>
        <td>${plLeft(m) > 0 ? `<div class="green">${money(plLeft(m))}</div>` : ""}${
          plTaken(m) > 0 ? `<div class="red">${money(plTaken(m))}</div>` : ""
        }${!plLeft(m) && !plTaken(m) ? "—" : ""}</td>
      </tr>`,
    )
    .join("");
  const totalRow = t
    ? `<tr class="hl"><td class="l">Grand total</td>
        <td>${d2(t.earned.sick)}</td><td>${d2(t.earned.casual)}</td><td>${d2(t.earned.paid)}</td>
        <td>${d2(t.taken.sick)}</td><td>${d2(t.taken.casual)}</td><td>${d2(t.taken.paid)}</td><td>${d2(t.taken.total)}</td>
        <td>${d2(t.deducted.sickCasual)}</td><td>${d2(t.deducted.paid)}</td><td>${d2(t.plRemaining)}</td><td></td>
        <td class="green">${money(t.encashment)}</td></tr>`
    : "";
  return `<table class="ledger">
    <thead>
      <tr><th class="l">Month</th><th>Earned<br/>Sick</th><th>Casual</th><th>Paid</th>
      <th>Taken<br/>Sick</th><th>Casual</th><th>Paid</th><th>Total</th>
      <th>Deducted<br/>S + C</th><th>Paid</th><th>PL left<br/>Days</th><th>Per day</th><th>PL Amount</th></tr>
    </thead>
    <tbody>${body}${totalRow}</tbody>
  </table>
  <p class="muted small">Leave taken is adjusted first against Sick and Casual Leave (not encashable), then against Paid Leave, oldest month first.
  Unused Paid Leave is paid at that month's salary ÷ days in that month. <span class="green">Green</span> = Paid Leave left (payable),
  <span class="red">Red</span> = Paid Leave used (not payable).</p>`;
}

export function buildSettlementHtml(data) {
  const s = data.staff || {};
  const lb = data.leaveBalance || {};
  const t = lb.totals;
  const fs = data.finalSettlement || {};

  const overview = [
    row("Staff Name", s.staffName),
    s.staffId ? row("Staff ID", s.staffId) : "",
    row("Date of Confirmation", fmtDate(s.confirmationDate)),
    row("Relieving Date", fmtDate(s.relievingDate)),
    row("Monthly Salary", money(data.monthlySalary)),
    row("Per Day Salary", money(data.perDaySalary)),
  ].join("");

  const leave = [
    lb.policy
      ? row(
          "Leave earned per month (Leave Policy)",
          `Sick ${d2(lb.policy.sickPerMonth)} · Casual ${d2(lb.policy.casualPerMonth)} · Paid ${d2(lb.policy.paidPerMonth)}`,
        )
      : "",
    t
      ? [
          row("Sick Leave earned", `${d2(t.earned.sick)} days`),
          row("Casual Leave earned", `${d2(t.earned.casual)} days`),
          row("Paid Leave earned", `${d2(t.earned.paid)} days`),
          row("Total Leave earned", `${d2(t.earned.sick + t.earned.casual + t.earned.paid)} days`, "b"),
          row("Sick Leave taken", `${d2(t.taken.sick)} days`),
          row("Casual Leave taken", `${d2(t.taken.casual)} days`),
          row("Paid Leave taken", `${d2(t.taken.paid)} days`),
          row("Total Leave taken", `${d2(t.taken.total)} days`, "b"),
          row("Deducted from Sick + Casual first", `− ${d2(t.deducted.sickCasual)} days`),
          row("Then deducted from Paid Leave (oldest month first)", `− ${d2(t.deducted.paid)} days`),
          row("Sick + Casual unused (lapsed — not paid)", `${d2(t.sickCasualUnused)} days`),
        ].join("")
      : "",
    row("Paid Leave Remaining (encashed)", `${d2(lb.paidRemaining)} days`, "hl"),
  ].join("");

  const salaryRows = (data.months || [])
    .map(
      (m) => `<tr class="${m.pending > 0 ? "hl" : ""}">
        <td class="l">${esc(m.label)}<div class="muted">${d2(m.payableDays - m.unpaidDays)}/${m.totalDays} days</div></td>
        <td>${money(m.earned)}</td><td>${money(m.paid)}</td><td>${m.pending > 0 ? money(m.pending) : "—"}</td></tr>`,
    )
    .join("");

  const finalRows = [
    (data.pendingMonths || []).length === 0 ? row("Pending Salary", money(0)) : "",
    ...(data.pendingMonths || []).map((m) =>
      row(
        m.beforeConfirmation
          ? `${m.label} salary (pending from before confirmation)`
          : `${m.label} salary (${d2(m.payableDays - m.unpaidDays)} of ${m.totalDays} days)`,
        money(m.pending),
      ),
    ),
    ...(fs.leaveEncashmentMonths || []).map((m) =>
      row(`Paid Leave ${m.label} (${d2(m.days)} days × ${money(m.perDaySalary)})`, money(m.amount)),
    ),
    row(`Leave encashment — Paid Leave only (${d2(fs.leaveEncashmentDays)} days)`, money(fs.leaveEncashment), "b"),
    row("Total Amount Payable", money(fs.totalAmountPayable), "b"),
    fs.outstandingAdvance > 0 ? row("Less: Outstanding Advance", `− ${money(fs.outstandingAdvance)}`) : "",
    row("Balance Payable — Full & Final Settlement", money(fs.balancePayable), "hl"),
  ].join("");

  const period = data.salaryPeriod || {};

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { margin: 28px; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #2d2d2d; font-size: 11px; }
  h1 { color: #153a69; font-size: 18px; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1f4a82; padding-bottom: 8px; margin-bottom: 14px; }
  .company { font-size: 13px; font-weight: 700; color: #153a69; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #1f4a82; color: #fff; text-align: left; padding: 6px 8px; font-size: 11px; }
  td { padding: 5px 8px; border: 1px solid #dee4ec; vertical-align: top; }
  .sec tbody tr:nth-child(even) td { background: #f5f8fc; }
  .r { text-align: right; white-space: nowrap; }
  .b td { font-weight: 700; }
  .hl td { background: #fdf0d1 !important; font-weight: 700; color: #78500a; }
  .grid td, .grid th { text-align: right; }
  .grid .l, .ledger .l { text-align: left; }
  .ledger { font-size: 8.5px; }
  .ledger th, .ledger td { text-align: right; padding: 3px 4px; }
  .muted { color: #787878; font-size: 9px; font-weight: 400; }
  .small { font-size: 9px; }
  .warn { color: #c2410c; font-size: 9px; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }
  .foot { color: #787878; font-size: 9px; margin-top: 6px; }
</style></head><body>
  <div class="head">
    <div><div class="company">${COMPANY_NAME}</div><h1>Full &amp; Final Settlement Statement</h1></div>
    <div class="muted">Salary ${esc(period.fromLabel)} to ${esc(fmtDate(s.relievingDate))}</div>
  </div>
  ${section("Overview", overview)}
  ${section("Leave Summary", leave)}
  ${ledgerHtml(lb)}
  <table class="grid"><thead><tr><th class="l">Month-wise Salary (${esc(period.fromLabel)} – ${esc(period.toLabel)})</th>
    <th>Salary Earned</th><th>Paid</th><th>Pending</th></tr></thead><tbody>${salaryRows}</tbody></table>
  ${section("Final Settlement Amount", finalRows)}
  <p class="foot">Figures are calculated live from attendance, leave and payroll records as of ${esc(
    fmtDate(new Date().toISOString()),
  )}.</p>
</body></html>`;
}

// Plain-text version of the key figures — used only when expo-print is not
// installed, so the staff member can still share / save their settlement.
function buildSettlementText(data) {
  const s = data.staff || {};
  const fs = data.finalSettlement || {};
  const lines = [
    `${COMPANY_NAME} — Full & Final Settlement`,
    `Staff: ${s.staffName || "—"}`,
    `Relieving date: ${fmtDate(s.relievingDate)}`,
    "",
    ...(data.pendingMonths || []).map((m) => `${m.label} salary: ${money(m.pending)}`),
    `Leave encashment (${d2(fs.leaveEncashmentDays)} days): ${money(fs.leaveEncashment)}`,
    `Total amount payable: ${money(fs.totalAmountPayable)}`,
    fs.outstandingAdvance > 0 ? `Less outstanding advance: − ${money(fs.outstandingAdvance)}` : null,
    `Balance payable: ${money(fs.balancePayable)}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

// Generates the PDF and opens the share / save sheet.
export async function downloadSettlementPdf(data) {
  if (!Print?.printToFileAsync) {
    // PDF module not installed — share the figures as text instead.
    Alert.alert(
      "PDF not available",
      "PDF download needs expo-print. Run: npx expo install expo-print expo-sharing. Sharing the settlement as text for now."
    );
    await Share.share({ message: buildSettlementText(data) });
    return null;
  }
  const html = buildSettlementHtml(data);
  const { uri } = await Print.printToFileAsync({ html });
  const name = String(data?.staff?.staffName || "Staff").replace(/[^\w-]+/g, "_");
  if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `Settlement_${name}.pdf`,
    });
  } else {
    // No share sheet: fall back to the system print dialog (Save as PDF).
    await Print.printAsync({ html });
  }
  return uri;
}
