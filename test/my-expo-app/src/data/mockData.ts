// ── Temporary/sample data ───────────────────────────────────────────────────
// These modules aren't wired to a backend endpoint yet. Instead of showing a
// blank "not connected" screen, every module renders this same shape of
// sample data so the UI can be reviewed end-to-end. Swap each block out for a
// real API call once the matching endpoint exists — the component code
// underneath already expects exactly this shape.

export const MOCK_NOTICE = 'Sample data — connect a backend endpoint to replace this with live data.';

export const payrollSummary = {
  month: 'August 2026',
  netPay: 68450,
  currency: '₹',
  earnings: [
    { label: 'Basic Salary', amount: 45000 },
    { label: 'House Rent Allowance', amount: 18000 },
    { label: 'Special Allowance', amount: 9500 },
    { label: 'Performance Bonus', amount: 4000 },
  ],
  deductions: [
    { label: 'Provident Fund', amount: 5400 },
    { label: 'Professional Tax', amount: 200 },
    { label: 'Income Tax (TDS)', amount: 2450 },
  ],
  history: [
    { month: 'Jul 2026', amount: 66120 },
    { month: 'Jun 2026', amount: 66120 },
    { month: 'May 2026', amount: 64980 },
  ],
};

// ── Payslip ──────────────────────────────────────────────────────────────
export const payslips = [
  { id: 'ps-08-2026', month: 'August 2026', amount: 68450, status: 'Generated' as const },
  { id: 'ps-07-2026', month: 'July 2026', amount: 66120, status: 'Generated' as const },
  { id: 'ps-06-2026', month: 'June 2026', amount: 66120, status: 'Generated' as const },
  { id: 'ps-05-2026', month: 'May 2026', amount: 64980, status: 'Generated' as const },
  { id: 'ps-04-2026', month: 'April 2026', amount: 64980, status: 'Generated' as const },
];

// ── Counseling ──────────────────────────────────────────────────────────
export const counselingSessions = {
  upcoming: [
    {
      id: 'cs-1',
      topic: 'Career growth check-in',
      counselor: 'Ananya Rao, HR Partner',
      date: '28 Aug 2026',
      time: '3:30 PM',
      mode: 'Video call' as const,
    },
  ],
  past: [
    {
      id: 'cs-2',
      topic: 'Onboarding feedback',
      counselor: 'Vikram Shah, HR Partner',
      date: '02 Jul 2026',
      time: '11:00 AM',
      mode: 'In-person' as const,
      outcome: 'Completed',
    },
    {
      id: 'cs-3',
      topic: 'Workload discussion',
      counselor: 'Ananya Rao, HR Partner',
      date: '14 May 2026',
      time: '4:00 PM',
      mode: 'Video call' as const,
      outcome: 'Completed',
    },
  ],
};

// ── Time off ─────────────────────────────────────────────────────────────
export const leaveBalance = [
  { label: 'Casual', used: 3, total: 12 },
  { label: 'Sick', used: 1, total: 8 },
  { label: 'Earned', used: 4, total: 15 },
];

export const mockLeaveRequests = [
  { _id: 'lr-1', leaveType: 'Casual Leave', fromDate: '2026-08-16', toDate: '2026-08-16', status: 'approved' as const },
  { _id: 'lr-2', leaveType: 'Sick Leave', fromDate: '2026-07-09', toDate: '2026-07-10', status: 'approved' as const },
  { _id: 'lr-3', leaveType: 'Earned Leave', fromDate: '2026-09-02', toDate: '2026-09-04', status: 'pending' as const },
];

// ── Overtime ─────────────────────────────────────────────────────────────
export const overtimeSummary = {
  monthHours: 12.5,
  pendingHours: 3,
  entries: [
    { id: 'ot-1', date: '19 Aug 2026', hours: 2, reason: 'Release deployment support', status: 'Approved' as const },
    { id: 'ot-2', date: '12 Aug 2026', hours: 3, reason: 'Client demo prep', status: 'Approved' as const },
    { id: 'ot-3', date: '05 Aug 2026', hours: 3, reason: 'Month-end reporting', status: 'Approved' as const },
    { id: 'ot-4', date: '21 Aug 2026', hours: 3, reason: 'Server migration window', status: 'Pending' as const },
  ],
};

// ── Resign ───────────────────────────────────────────────────────────────
export const resignationInfo = {
  noticePeriodDays: 60,
  status: 'none' as 'none' | 'submitted' | 'in-review',
  steps: [
    { title: 'Submit request', description: 'Share your last working day and reason for leaving.' },
    { title: 'Manager review', description: 'Your reporting manager reviews and countersigns the request.' },
    { title: 'HR clearance', description: 'HR schedules an exit interview and settles handover items.' },
    { title: 'Full & final settlement', description: 'Dues are settled and relieving letter is issued.' },
  ],
};

// ── Other tools ─────────────────────────────────────────────────────────
export const otherTools = [
  { key: 'helpdesk', label: 'Helpdesk', emoji: '🎧', bg: 'bg-indigo-100', description: 'Raise a ticket with IT or admin support.' },
  { key: 'documents', label: 'Documents', emoji: '📁', bg: 'bg-pink-100', description: 'Access your offer letter, ID proofs, and forms.' },
  { key: 'announcements', label: 'Announcements', emoji: '📢', bg: 'bg-amber-100', description: 'Company-wide updates and notices.' },
  { key: 'policies', label: 'Policies', emoji: '📘', bg: 'bg-emerald-100', description: 'HR policies, code of conduct, and handbooks.' },
  { key: 'assets', label: 'Assets', emoji: '💻', bg: 'bg-indigo-100', description: 'Laptop, ID card, and other issued assets.' },
  { key: 'support', label: 'Ask HR', emoji: '💬', bg: 'bg-pink-100', description: 'Chat directly with your HR representative.' },
];
