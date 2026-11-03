# Continuous leave = ONE card everywhere (3 Nov 2026)

- A leave of several days in a row (e.g. 9 – 13 Nov) now shows as ONE card with "Dates 9 Nov – 13 Nov",
  the total days and "View 5 days" — in Activity (pending, Approve / Reject all days at once), Home → Leave
  (pending + Leave History after approval, and the staff member's own requests) and Staff-wise leave.
- Days are joined when they came from the same request OR follow each other day after day for the same
  person with the same status. Weekly off days in between (Sunday, or Friday + Saturday) do not break a
  leave; a working day in between starts a new card. So days an admin entered one by one and automatic
  absent / sandwich days are joined too.
- Mixed types in one leave show as e.g. "4 Paid + 1 Unpaid". Pending and approved days stay separate cards.
- Staff-wise leave → a person: the old one-row-per-date list is replaced by the same cards.
- Code: `groupLeaveRequests()` in `src/components/LeaveActivityCards.jsx`. No backend change.

# Leave tab uses the Activity layout (3 Nov 2026)

- Home → Leave now looks exactly like the Activity tab: purple section titles with a count and
  "View all ›", white rounded cards, one block per request (a multi-day request is ONE block with
  "View N days"), label : value rows (leave type, dates, total, half day, applied on, reason, remarks)
  and a status badge.
- Staff: "Apply for Leave" card (dates are now picked from a calendar instead of typed) and
  "My Leave Requests" with All / Pending / Approved / Rejected filters.
- Admin: "Leave requests" → "Pending Leave Requests" with full-width Approve / Reject (updates every
  day of a multi-day request; hidden when view-only) and "Leave History" (Approved / Rejected / All).
  "Staff-wise leave" is unchanged. Pull down to refresh.
- The leave cards now live in `src/components/LeaveActivityCards.jsx` and the Activity tab uses the same
  file, so the two screens stay identical. Set `SHOW_COUNT` in `LeaveRequestsScreen.jsx` to change how
  many requests show before "View all".
- No backend change.

# Activity tab shows data again - latest record with full details (3 Nov 2026)

- The Activity tab was empty: it called endpoints that do not exist on the server. It now uses the app's real
  calls (`attendanceService` + `AttendanceContext`), same as Home and Leave.
- Each section shows only the LATEST record with all its details (in / out / hours worked / status for
  attendance; type, dates, total days, applied on, reason, remarks, each day for leave). "View all" shows the
  rest. Set `SHOW_COUNT = 2` in `ActivityScreen.jsx` to show two records instead of one.
- Admin: today's attendance of all staff + pending leave requests (Approve / Reject updates every day of a
  multi-day request; hidden when view-only). Staff: own attendance today + own leave requests.
- Purple "Activity" header restored.

# Super admin is view-only in client companies + company-country phone default (3 Nov 2026)

Brings the app in line with the website (backend unchanged - it already enforces all of this).

- **View only.** A super admin who opens a CLIENT company can look but not change anything: that company's
  own admin adds staff and edits its details. The super admin's own (owner) company stays fully editable.
  The app knows this from `company.isOwner` (login, `/api/auth/me`, company list).
  - `utils/api.js` stops every write with a "View only" message (company management, login/session calls and
    the super admin's own profile photo stay allowed - same list as the server). The server refuses it too
    (`403 CLIENT_COMPANY_READ_ONLY`).
  - Hidden while view-only: staff Enable/Disable, document upload/remove, referral edit, late-deduction
    switches, leave and resignation Approve/Reject, office Wi-Fi save/remove, letter Generate/Withdraw,
    birthday Wish, Add staff. Amber "View only" banner on Home and Staff.
  - `useAuth().isViewOnly`; `canAccess("staff.add")`-style keys are false while view-only.
- **Companies list (super admin).** Client cards say "View dashboard"; the owner card shows "YOUR COMPANY" and has
  no Deactivate / Delete. Editing a client company locks name + country (set at creation); Wi-Fi is owner-only;
  new "Internship & Probation" switch (same as the website).
- **Add staff (company admin).** Staff tab -> "+ Add staff": name, contact number, joining date, date of birth,
  gender, designation, department, Staff ID (optional), login e-mail + password.
- **Phone country.** The contact number starts with the COMPANY's country flag + code (Saudi -> flag +966,
  Qatar -> +974 ...; India when the company has none). Tap the flag to pick any other country. Stored as
  "+<code> <number>" like the website. New: `utils/phone.js`, `components/PhoneField.jsx`,
  `components/AddStaffModal.jsx`, `components/ViewOnlyBanner.jsx`.
- Staff details now show the saved contact number (`contactNo`).
- New dependency `libphonenumber-js` -> run `npm install`.

# Super admin: company list (like the website) + profile photo (29 Oct 2026)

- A super admin who logs in now sees **Your companies** first - the app version of the website's Companies
  page: a card per company (logo or coloured badge, country flag + currency, Staff / Admins / Profile %,
  progress bar, Active / Inactive), search, country filter chips, pull to refresh. Tap a card -> that
  company's dashboard. **Change company** (Home header, Profile) returns to the list. Every new login starts at
  the list; the app reopens on the last opened company while the session lasts.
  New: `src/screens/CompanyListScreen.jsx`, `src/services/companyService.js`.
- Uses the backend as it is - **no backend change needed**: `GET /api/company` for the list and
  `X-Company-Id` on every request after a company is opened (same as the website's "Open").
  A company that was deleted meanwhile sends the super admin back to the list with a message (not a logout).
  Inactive companies cannot be opened (same as the website).
- **Profile photo for the super admin** (shown on the company list, Home and Profile; add / change / remove).
  It was empty because the app only looked at the Staff record, which a super admin does not have. It now uses
  the account photo the server returns (`photoUrl` on login / `/api/auth/me`, `/api/documents/me`).
- The app now reads the company the way the backend sends it (`slug`, `currencyCode`, `timeZone`,
  `weeklyOffDays`): correct currency, time zone and weekend (e.g. Fri + Sat in Saudi Arabia / Qatar) for every
  user. Payslip letterhead: the ZAP artwork is used only for a company whose name starts with "ZAP"
  (same rule as the backend); other companies get their own name.
- Company inactive / not linked (`COMPANY_INACTIVE`, `COMPANY_MISSING`) in the middle of a session now signs
  the user out with the server's message.

# New HRM-EOVO logo (29 Oct 2026)

- Replaced the product logo with the "Effective Oriented Virtual Outstanding" version. Regenerated from the new
  artwork (transparent background): assets/eovo-logo.png (loading screen + Login), icon.png, adaptive-icon.png,
  splash.png, favicon.png. No code change needed for the image itself - AppLogo.jsx still loads eovo-logo.png.
- APP_TAGLINE (Login screen) changed to "Effective Oriented Virtual Outstanding" to match the logo.
- Icon / splash changed, so make a NEW build (EAS) - it will not update over-the-air.

# Login by Staff ID / email only (29 Oct 2026)

- Company Code and Country fields removed from Login. The server finds the company from the Staff ID prefix
  (ZS0019 → ZAP Solutionz, TB0001 → Typer Bag) or the email, and the app shows that company's dashboard.
  See BACKEND_CHANGES.md. Login screen is back to the previous layout with the HRM-EOVO logo in the centre.

# HRM-EOVO branding (29 Oct 2026)

- New product logo (assets/eovo-logo.png): app icon, splash (centred on white), loading screen and Login page.
  App name is now "HRM-EOVO". All ZAP logo / name removed from the app screens.
- Inside the app the logo is the logged-in COMPANY's own (`company.logoUrl` from the server, shown in every
  screen header); a company without a logo shows its initials. Make a NEW build (icon / splash changed).

# Company + country login (29 Oct 2026)

- Not limited to 2 companies / 2 countries: all 246 countries (searchable picker) and any number of companies by code. Country is optional at login (detected from the company).

- Login now has Company Code + Country. After login every screen shows that company's data only,
  in that country's currency, weekend and time zone. See BACKEND_CHANGES.md "Multi-company /
  multi-country" — the server must also scope all data by company (not included in this zip).
- New: `src/config/tenants.js` (countries), `src/utils/tenant.js` (current company), tenant-aware
  `formatMoney`, PDFs, logo, weekend and time-zone handling.

# Disabled staff + Enable/Disable from the app (14 Oct 2026)

- **Staff tab (admin / super admin)** lists EVERY staff member, including disabled ones
  (`GET /api/staff?includeHidden=true`). Before, the app asked for the normal list, so a disabled
  person vanished from the Staff tab and could not be enabled again.
- **Enable / Disable switch** on every row and in the staff details (super admin, and admins who
  have the Staff tab). Asks for confirmation, updates at once, and puts the switch back if the
  server refuses. Filter chips: All / Enabled / Disabled (count).
- Every other screen (attendance, leave, payroll, advances, pending salary, letters, birthdays,
  pickers) uses the normal list, which never contains disabled staff. The app also filters
  `enabled === false` itself as a second safety net.
- After a switch the phone drops its cached lists (staff, attendance, home cards, birthdays) so the
  person disappears from / returns to every screen without restarting the app.
- **A disabled person's own app**: when the server answers `403 STAFF_INACTIVE` / `STAFF_RELIEVED`
  the app now signs out, clears everything cached on the phone (profile, lists, photo, background
  attendance) and shows "You are not allowed to login because admin has deactivated you." on the
  login screen. Before, only a 401 did this, so the old data stayed on screen.

# Letters, resignation date & birthday wishes (13 Oct 2026)

## HR letters (backend + website + app)
- All six letters (Offer, Joining, Confirmation, Termination, Leaving, Experience) now open the
  "Generate letter" details form and are made by the server — the app shows/downloads exactly
  the same PDF as the website.
- Termination letter: an admin / super admin can pick ANY staff member and generate it. The
  form asks for the last working day (any date: past, today or future) and an optional reason.
  Once generated, it unlocks in that staff member's app.
- Leaving / Experience letters: the last working day comes from the staff member's resignation
  (approved, else pending). With no resignation, HR picks any date — today or a future date for
  someone still working. Approving a resignation later moves an already generated letter to the
  approved date. Wording switches to future tense ("will be relieved on …") for a future date.
- Letter date for these three = the last working day once it has come; today while it is still
  in the future.
- Mobile app: letter tiles are never locked for admin / super admin — they open the Generate
  Letters screen (pick staff, generate, view, download, withdraw). Staff tiles stay locked until
  HR generates the letter.

## Birthday wishes (app + website)
- On the birthday itself, from 12:00 midnight India time, every colleague gets a "🎉 Wish"
  button (Home "Birthday today" card + Upcoming Birthdays list in the app; dashboard card on the
  website). It opens a party modal (balloons, cake, confetti, gifts) with ready-made wishes and
  a box to write any message (300 chars).
- The birthday person sees how many colleagues wished them and can read every message.
- Card reloads itself at midnight. DOB is read in India time so the day is never off by one.

## Speed
- Letter status no longer queries resignations; admin app skips the "my letters" call.
- App letters screen loads the staff member's letters and history once (switching type is instant).
- Birthday photos: full staff list fetched at most every 5 min instead of on every Home focus.

## Fix
- frontend: `Leavehistorymodal.jsx` renamed to `LeaveHistoryModal.jsx` (the imports use that
  name; the build failed on Linux/Vercel).

# Mobile app changes (Oct 2026)

Run once after pulling: `npx expo install expo-image-picker expo-document-picker expo-file-system`
(already in package.json), then make a new build (new native modules + camera/photos permission).

- **My Documents** tile + Profile: upload profile photo (camera / gallery), Aadhaar, PAN, light bill
  (photo or PDF), view / replace / remove.
- Profile photo shown in the Home header (initials such as "SP" when there is none), Profile,
  staff list / details, staff picker and birthdays.
- **Birthdays**: photo with a cake, "in 3 days"; on the birthday (from 12:00 midnight) everyone else
  gets a **Wish** button; the birthday person gets no Wish button and sees who wished them.
- **Resign** tile (staff): apply with last working day + reason, see status, withdraw while pending.
  After approval the relieving date = that last working day (not the approval date).
- **Super admin**: no attendance card / clock-in on Home, Profile or Attendance tab.
  Advances staff-wise with totals + grand total; Payroll lists every staff name first, tap for month-wise payroll.
- **Leave (admin + super admin)**: "Staff-wise leave" tab — each staff member, tap for every leave taken.
- **Expenses**: all categories (light bill, breakfast, …) with category filter, totals and breakdown.
- **Letters (admin + super admin)**: never locked — choose staff, generate / download / withdraw,
  plus the list of all previously generated letters. Leaving / experience / termination letters are
  dated with the last working day, not today.
- **Wi-Fi Setup** is now its own tile (admins) instead of a card on Home.
- Salary slip and letter PDFs are saved as `<Staff_Name>_<Month>_<Year>.pdf` / `<Staff_Name>_<Letter>.pdf`.

## Update — 12 Oct 2026

Make a **new build** (new permissions: background location + foreground service).

- **Birthday photos**: the birthday card / list now reloads when Home is opened, when the app comes
  back to the front and on pull-to-refresh (before, it loaded once per app start, so a photo uploaded
  by a colleague didn't show until the app was restarted). It also accepts more photo-link formats,
  retries a photo that failed to load, and admins get the photo from the staff list if the birthday list
  has none. See BACKEND_CHANGES.md §1 if colleagues still see initials.
- **Fully automatic attendance** (staff, Location = "Allow all the time"): no Clock in / Clock out buttons.
  - Signed in when the phone reaches the office (office Wi-Fi, or the office GPS circle).
  - The GPS circle is learned automatically the first time the office Wi-Fi is confirmed
    (or set `extra.office.location` in app.json).
  - Leaving (geofence exit / Wi-Fi gone + outside the circle) logs the time. Coming back logs "back in".
    Wi-Fi drops under 5 min are ignored.
  - Out during lunch (`extra.office.lunch`, default 1–2 PM) = lunch break, fine.
  - Out more than 10 min outside lunch (`autoSignOut.confirmMinutes`), or still out 30 min after lunch
    ends = gone for the day → automatic sign-out; **going time = when the phone left**.
  - Home + Attendance show In time, each break with duration (lunch marked fine), Going time,
    time in office.
  - Without "Allow all the time" the manual buttons stay, with a link to turn it on.
- **Pending Salary tab** (new bottom tab):
  - Staff: earlier months not fully paid; current month skipped. Partly paid → only the unpaid part.
    No payroll yet → estimate − advance given (same as the website month summary).
    Still shown after resigning, up to the relieving month.
  - Admin / super admin: every staff member with something owed → tap for months.

## Update — 12 Oct 2026 (birthday card)

- **Upcoming Birthday card** shows every upcoming person's photo together at the top (up to 4, then "+N"),
  with "Also: …" names under the next birthday. Before, only the next person had a real photo.

## Update — 12 Oct 2026 (letters)

- Admin Letters: Generate (Offer / Joining / Confirmation) opens the same details form as the website.
- Staff can download these letters even if a date is missing on their profile (the server uses HR's details).
