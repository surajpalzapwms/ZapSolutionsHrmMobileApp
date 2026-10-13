# HRM White-label App (Expo)

One codebase -> separate app per company (own icon, name, splash, package id),
plus company logo/colors/data loaded from your API after launch.

## Setup
    npm install
    npx expo install --check

## Run on your phone (dev build, shows the company icon)
    npm run android:acme
    npm run android:globex

## Release APK per company
    npm i -g eas-cli && eas login
    npm run build:acme
    npm run build:globex

## Add a new company
1. Add an entry in `src/config/companies.js`
2. Put icon.png (1024x1024), adaptive-icon.png (1024x1024, logo inside the center ~66%), splash.png in `assets/companies/<key>/`
3. Add scripts `android:<key>` / `build:<key>` in package.json

## Connect your backend
In `src/api/client.js` set `USE_MOCK = false`. Endpoints expected:
- POST /api/auth/login          -> { token, user }
- GET  /api/company/branding    -> { data: { name, logoUrl, primaryColor, sidebarColor } }  (same as website)
- GET  /api/staff               -> staff list
Data stays company-wise because each company has its own apiUrl and token.

NOTE: Expo Go always shows the Expo Go icon. Use a dev build or APK to see your icon.
