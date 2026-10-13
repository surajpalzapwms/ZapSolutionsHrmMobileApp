// src/utils/payslipPdf.js — one month's salary slip as an A4 PDF, laid out
// like the ZAP Solutionz "Salary A4 Document" template:
//   header logos + gold rule · EMPLOYEE PAYSLIP · employee details ·
//   Earnings box · Deductions box · Net Salary Received ·
//   Net Pay / Bank / Payment mode · signatures + stamp · footer logos.
//
// Totals reconcile with the payroll record:
//   Total earnings   = basic salary + allowances
//   Total deductions = leave (unpaid days) + deductions + advance recovered
//   Net salary       = item.netSalary (what the backend saved)
import { COMPANY_NAME, esc, longDate, sharePdf } from "./pdfShare";
import { formatPeriod } from "./format";
import { FOOTER_IMG, HEADER_IMG, STAMP_IMG } from "./payslipAssets";

const num = (v) => Number(v) || 0;
const NA = "NA";
const rs = (v) => `₹ ${num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nameOf = (x) => String(x?.type || x?.name || x?.title || "").trim();

// Template rows. Allowances whose name matches go into these rows; anything
// else is listed as its own row underneath. A row with nothing shows "NA".
const EARNING_SLOTS = [
  { label: "Housing Allowance", re: /hous|hra|rent/i },
  { label: "Transportation", re: /transport|conveyance|travel|fuel|petrol/i },
  { label: "Performance Bonus", re: /bonus|perform|incentive/i },
];
const DEDUCTION_SLOTS = [
  { label: "Tax (Central + State)", re: /tax|tds|gst|professional/i },
  { label: "Health Insurance", re: /health|medical|mediclaim|esi/i },
  { label: "General Insurance", re: /insurance|lic|pf|provident/i },
];

// Put each {name, amount} into the first matching slot; returns rows.
function slotRows(slots, items) {
  const filled = slots.map((s) => ({ label: s.label, amount: null }));
  const extra = [];
  items.forEach((it) => {
    const n = nameOf(it);
    const i = slots.findIndex((s) => s.re.test(n));
    if (i >= 0) filled[i].amount = num(filled[i].amount) + num(it.amount);
    else extra.push({ label: n || "Other", amount: num(it.amount) });
  });
  return [...filled, ...extra];
}

const maskAccount = (v) => {
  const s = String(v || "").replace(/\s+/g, "");
  if (!s) return "";
  return s.length > 4 ? `XXXX XXXX ${s.slice(-4)}` : s;
};

const titleCase = (v) =>
  String(v || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const lineRow = (label, value) =>
  `<tr><td class="l">${esc(label)}</td><td class="c">:</td><td class="v">${esc(value)}</td></tr>`;

export function buildPayslipHtml(item, staffArg = {}) {
  // Profile: the populated employee on the record (admin view) + whatever
  // the caller passed (own profile for staff).
  const emp = item.employeeId && typeof item.employeeId === "object" ? item.employeeId : {};
  const s = { ...emp, ...(staffArg || {}) };
  const info = item.attendanceInfo || {};

  const name = item.staffName || item.staff?.name || s.staffName || s.name || "";
  const staffId = s.staffId || s.employeeCode || "";
  const department = s.department || s.departmentName || "";
  const designation = s.designation || s.projectName || "";
  const period = formatPeriod(item.period || item.month);
  const payDate = item.paymentDate ? longDate(item.paymentDate) : "10th/month";

  // ── Earnings ──
  const basic = num(item.basicSalary);
  const adjusted = item.adjustedBasicSalary != null ? num(item.adjustedBasicSalary) : null;
  const allowances = (Array.isArray(item.allowances) ? item.allowances : []).filter((a) => num(a.amount));
  const earnRows = [{ label: "Basic Salary", amount: basic }, ...slotRows(EARNING_SLOTS, allowances)];
  const allowanceTotal = item.totalAllowance != null && num(item.totalAllowance)
    ? num(item.totalAllowance)
    : allowances.reduce((t, a) => t + num(a.amount), 0);
  const totalEarnings = basic + allowanceTotal;

  // ── Deductions ──
  const deductions = (Array.isArray(item.deductions) ? item.deductions : []).filter((d) => num(d.amount));
  const leaveDeduction =
    adjusted != null && basic - adjusted >= 0.01 ? basic - adjusted : num(info.leaveDeduction);
  const dedRows = slotRows(DEDUCTION_SLOTS, deductions);
  if (leaveDeduction) {
    const days = num(info.unpaidLeaves);
    dedRows.push({ label: days ? `Leave Deduction (${days} day${days === 1 ? "" : "s"})` : "Leave Deduction", amount: leaveDeduction });
  }
  if (num(item.advanceDeduction)) dedRows.push({ label: "Advance Recovered", amount: num(item.advanceDeduction) });
  const dedListTotal = item.totalDeduction != null && num(item.totalDeduction)
    ? num(item.totalDeduction)
    : deductions.reduce((t, d) => t + num(d.amount), 0);
  const totalDeductions = dedListTotal + leaveDeduction + num(item.advanceDeduction);

  const net = num(item.netSalary ?? item.netPay ?? item.amount);
  const totalPayable = item.totalPayable != null ? num(item.totalPayable) : net;
  const paid = num(item.paidAmount);
  const pending = item.pendingAmount != null ? num(item.pendingAmount) : Math.max(0, totalPayable - paid);

  // ── Payment ──
  const bank =
    maskAccount(s.bankAccount || s.accountNumber || s.bankAccountNumber || s.bankDetails?.accountNumber) || NA;
  const mode = item.paymentMethod ? titleCase(item.paymentMethod) : "Bank Transfer";

  const moneyRows = (rows) =>
    rows
      .map(
        (r) =>
          `<tr><td class="l">${esc(r.label)}</td><td class="c">:</td><td class="v">${
            r.amount == null ? NA : esc(rs(r.amount))
          }</td></tr>`,
      )
      .join("");

  // Squeeze rows a little when there are many, to keep one A4 page.
  const rowCount = earnRows.length + dedRows.length;
  const rowH = rowCount > 12 ? 13 : rowCount > 10 ? 14.5 : 16;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: "Noto Sans", Roboto, "Open Sans", Arial, sans-serif; color: #2b2b2b; }
  .page { position: relative; width: 595pt; min-height: 841pt; display: flex; flex-direction: column; overflow: hidden; }
  .hdr { display: block; width: 595pt; height: auto; }
  .ftr { position: absolute; left: 0; bottom: 0; width: 595pt; height: auto; z-index: 0; }
  .body { position: relative; z-index: 1; padding: 0 50pt; flex: 1; display: flex; flex-direction: column; }
  h1 { margin: 4pt 0 12pt; text-align: center; font-size: 11.5pt; font-weight: 800; letter-spacing: 0.4pt; color: #0c3754; }

  table { border-collapse: collapse; }
  .info { margin: 0 0 6pt 9pt; font-size: 10.5pt; }
  .info td { padding: 1pt 0; vertical-align: top; }
  .info .l { width: 104pt; font-weight: 700; color: #333; }
  .info .c { width: 6pt; }
  .info .v { color: #444; }

  .box { position: relative; background: #f6e7b4; border-radius: 13pt; margin-top: 20pt; padding: 4pt 16pt 0 16pt; }
  .tab { position: absolute; left: 18pt; top: -12pt; width: 188pt; height: 24pt; background: #00496f;
         clip-path: polygon(0 0, 100% 0, 88% 100%, 12% 100%); border-radius: 4pt 4pt 0 0;
         color: #fff; font-weight: 700; font-size: 12pt; text-align: center; line-height: 23pt; }
  .rows { width: 100%; margin-top: 12pt; font-size: 10.8pt; color: #262626; }
  .rows td { height: ${rowH}pt; padding: 0; }
  .rows .l { width: 168pt; }
  .rows .c { width: 20pt; }
  .rows .v { text-align: right; white-space: nowrap; }
  .total { display: flex; justify-content: space-between; align-items: center; margin: 5pt -16pt 0; padding: 6pt 16pt 7pt;
           border-top: 1.5pt solid #ecd38f; font-weight: 800; font-size: 11.6pt; color: #153a69; }
  .net { margin-top: 16pt; border-radius: 13pt; background: #f6e7b4; padding: 9pt 16pt; display: flex;
         justify-content: space-between; font-weight: 800; font-size: 12.2pt; color: #1b1b1b; }
  .pending { margin-top: 4pt; font-size: 9.5pt; color: #8a5a00; text-align: right; padding-right: 16pt; }

  .bottom { margin-top: auto; padding: 14pt 0 40pt 6pt; position: relative; min-height: 196pt; }
  .pay { font-size: 9.5pt; font-weight: 700; color: #333; }
  .pay td { padding: 1pt 0; }
  .pay .l { width: 104pt; }
  .pay .c { width: 6pt; }
  .left { width: 270pt; }
  .auth { margin-top: 18pt; font-size: 10pt; color: #3a3a3a; line-height: 1.55; }
  .auth p { margin: 0 0 8pt; }
  .right { position: absolute; left: 345pt; top: 24pt; font-size: 10pt; color: #3a3a3a; line-height: 1.55; }
  .right .sig { margin-top: 64pt; }
  .stamp { position: absolute; left: 214pt; top: 76pt; width: 89pt; height: 89pt; }
</style></head><body>
<div class="page">
  <img class="hdr" src="${HEADER_IMG}"/>
  <img class="ftr" src="${FOOTER_IMG}"/>
  <div class="body">
    <h1>EMPLOYEE PAYSLIP</h1>

    <table class="info"><tbody>
      ${lineRow("Month", period)}
      ${lineRow("Employee Name", name)}
      ${lineRow("Employee ID", staffId || NA)}
      ${lineRow("Department", department || NA)}
      ${lineRow("Designation", designation || NA)}
      ${lineRow("Pay Date", payDate)}
    </tbody></table>

    <div class="box">
      <div class="tab">Earnings</div>
      <table class="rows"><tbody>${moneyRows(earnRows)}</tbody></table>
      <div class="total"><span>Total Earnings</span><span>${esc(rs(totalEarnings))}</span></div>
    </div>

    <div class="box">
      <div class="tab">Deductions</div>
      <table class="rows"><tbody>${moneyRows(dedRows)}</tbody></table>
      <div class="total"><span>Total Deductions</span><span>${esc(rs(totalDeductions))}</span></div>
    </div>

    <div class="net"><span>Net Salary Received</span><span>${esc(rs(net))}</span></div>
    ${pending > 0.009 ? `<div class="pending">Paid ${esc(rs(paid))} · Pending ${esc(rs(pending))}</div>` : ""}

    <div class="bottom">
      <div class="left">
        <table class="pay"><tbody>
          ${lineRow("Net Pay", rs(net))}
          ${lineRow("Bank Account", bank)}
          ${lineRow("Payment Mode", mode)}
        </tbody></table>
        <div class="auth">
          <p>Authorized by:<br/>Finance Manager – ${esc(COMPANY_NAME)}</p>
          <p>Created by - Accounts team</p>
          <p>Approved by Admin</p>
        </div>
      </div>
      <img class="stamp" src="${STAMP_IMG}"/>
      <div class="right">
        <div>Prepared by:</div>
        <div class="sig">Richard Sanchez<br/>${esc(COMPANY_NAME)}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthName(period) {
  const m = /^(\d{4})-(\d{1,2})/.exec(String(period || ""));
  if (!m) return String(period || "").replace(/[^\w-]+/g, "_") || "Salary_Slip";
  return `${FULL_MONTHS[Number(m[2]) - 1] || m[2]}_${m[1]}`;
}

export async function downloadPayslipPdf(item, staff) {
  const html = buildPayslipHtml(item, staff);
  const emp = item.employeeId && typeof item.employeeId === "object" ? item.employeeId : {};
  const who = String(staff?.staffName || item.staffName || emp.staffName || "Staff").trim().replace(/[^\w-]+/g, "_");
  // File name = staff name + month name, e.g. "Suraj_Pal_October_2026.pdf".
  return sharePdf(html, `${who}_${monthName(item.period || item.month)}.pdf`);
}
