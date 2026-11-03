# Super admin on the app - no backend change needed (29 Oct 2026)

The app uses what the backend already has: `GET /api/company` (super admin only) for the company list,
`X-Company-Id: <company _id>` on every request once a company is opened, `/api/documents/me` (GET / POST /
DELETE, type `photo`) for the super admin's own profile photo, and `photoUrl` / `company` from
`POST /api/auth/login` and `GET /api/auth/me`. See be/WHITE_LABEL.md and be/MOBILE_API_CHANGES.md.

---

# Multi-company / multi-country — login by Staff ID or email only (29 Oct 2026)

The login screen has only **Email or Staff ID** + **Password**. There is no company or country field.
The server works out the company and country, and the app then shows that company's dashboard.

## How the company is found
Every company has its own Staff ID prefix, and every Staff ID = prefix + number:

| Company       | Prefix | Staff IDs            |
|---------------|--------|----------------------|
| ZAP Solutionz | `ZS`   | ZS0001 … ZS0019 …    |
| Typer Bag     | `TB`   | TB0001, TB0002 …     |
| (next one)    | e.g. `AB` | AB0001 …          |

`POST /api/auth/login` body is `{ email, password, client }` where `email` holds either an email or a Staff ID.

1. Contains `@` → find the user by email (case-insensitive).
2. Otherwise read the letters at the start (`/^([A-Za-z]+)(\d+)$/`), find the company whose
   `staffIdPrefix` equals those letters (case-insensitive), then find the staff **inside that company**.
3. Same email used in two companies → answer 409 "Use your Staff ID to sign in".
4. Wrong prefix / unknown ID / wrong password → the same "Invalid credentials" message.

Staff IDs must therefore be **unique across all companies**, and each `staffIdPrefix` must be unique.
When an admin adds a staff member, generate the next ID as `prefix + zero-padded counter` (TB0001, TB0002…)
with one counter per company.

## Login answer
Return inside `data` the company of that user (the country comes from the company, not from the user):
`company: { _id, code, name, staffIdPrefix, country ("IN","SA",… ISO 2-letter), currency?, currencySymbol?,
timezone?, utcOffsetMinutes?, weekend? ([0-6], 0=Sun), logoUrl, primaryColor, signatory }`.
Only `code`, `name`, `country` are required; the app fills the rest from its country table
(`src/config/countries.js`). `GET /api/auth/me` returns the same `company` object.

## Keep each company's data separate (this is what really protects the data)
1. **Company model** as above — any number of companies, in any country (many in India, many in Saudi Arabia…).
2. **Add `companyId` (and `companyCode`) to every collection**: users, staff, attendance, leaves, payroll,
   advances, expenses, holidays, letters, documents, resignations, presence/office networks…
   Back-fill existing data as ZAP (`ZS`, India).
3. **Put `companyId` inside the JWT.** One middleware sets `req.companyId` from the token and adds
   `{ companyId: req.companyId }` to EVERY query / create / update / delete. Never read the company from
   the request body or headers.
4. The app sends `X-Company-Code` and `X-Country` headers. Compare with the token's company; on a difference
   answer `403 { code: "COMPANY_MISMATCH" }` (the app then signs out).
5. Holidays, Saturday-holiday rules, office Wi-Fi / GPS circles and letter templates are per company.

---

