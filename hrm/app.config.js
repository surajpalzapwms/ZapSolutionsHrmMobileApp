// Build-time branding: app NAME, ICON, SPLASH and PACKAGE ID are fixed per build.
// Choose a company with:  COMPANY=acme  (see package.json scripts)
const COMPANIES = require("./src/config/companies");

const key = process.env.COMPANY || "acme";
const c = COMPANIES[key];
if (!c) throw new Error(`Unknown COMPANY "${key}". Add it in src/config/companies.js`);

module.exports = {
  expo: {
    name: c.appName,
    slug: `hrm-${key}`,
    version: "1.0.0",
    orientation: "portrait",
    icon: c.icon,
    userInterfaceStyle: "light",
    splash: { image: c.splash, resizeMode: "contain", backgroundColor: c.colors.primary },
    android: {
      package: c.androidPackage,
      adaptiveIcon: { foregroundImage: c.adaptiveIcon, backgroundColor: c.colors.primary },
    },
    ios: { bundleIdentifier: c.androidPackage },
    extra: { company: key },
  },
};
