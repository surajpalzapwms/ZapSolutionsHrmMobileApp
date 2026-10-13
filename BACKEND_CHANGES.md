# Server changes needed (backend is not in this zip)

The app side is fixed. Two small things must also be true on the server.

## 1. Birthday photos visible to every staff member
The app shows whatever photo link `GET /api/staff/birthdays/upcoming` returns.
If a colleague still sees initials after this update, the server is doing one of these:

- **Not sending the photo link.** Each birthday item needs `photoUrl`
  (the same signed link `/api/documents/me` returns for that person's photo).
- **Refusing the photo to other staff.** Photos are private (owner / admin / super admin).
  When the link is a valid *signed* link (`?v=…&s=…`), allow **any logged-in user** to load it.
  Aadhaar / PAN / light bill must stay private — this is only for `type: "photo"`.

Example (Express):

```js
// GET /api/documents/photo/:staffId?v=&s=
if (doc.type === "photo" && validSignature(req.query)) return sendFile(doc); // any logged-in user
// …existing owner / admin check for everything else
```

## 2. Automatic sign-out with the real going time
When a staff member leaves the office the app calls
`POST /api/hrm/leaves/attendance/checkout` with
`{ "logoutTime": "<ISO time the phone left>", "auto": true, "reason": "left_office" }`.

- Use `logoutTime` (if it is today, after `loginTime` and not in the future) instead of "now",
  so the going time is exact even if the phone checked a few minutes later.
- If the server refuses (e.g. "sign-out unlocks after 7h 45m"), the app still shows the
  going time on the phone and retries every 30 minutes.
