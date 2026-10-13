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
