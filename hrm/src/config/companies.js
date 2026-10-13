// One entry per company. Add a new company here + put its images in assets/companies/<key>/
module.exports = {
  acme: {
    appName: "Acme HRM",
    androidPackage: "com.yourorg.acme",
    icon: "./assets/companies/acme/icon.png",
    adaptiveIcon: "./assets/companies/acme/adaptive-icon.png",
    splash: "./assets/companies/acme/splash.png",
    colors: { primary: "#1d4ed8", accent: "#f59e0b" },
    apiUrl: "https://acme.yourapi.com", // your backend for this company
  },
  globex: {
    appName: "Globex People",
    androidPackage: "com.yourorg.globex",
    icon: "./assets/companies/globex/icon.png",
    adaptiveIcon: "./assets/companies/globex/adaptive-icon.png",
    splash: "./assets/companies/globex/splash.png",
    colors: { primary: "#047857", accent: "#e11d48" },
    apiUrl: "https://globex.yourapi.com",
  },
};
