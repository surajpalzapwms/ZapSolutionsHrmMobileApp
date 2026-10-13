import React, { createContext, useContext, useEffect, useState } from "react";
import { getCompanyProfile, companyKey } from "../api/client";
const COMPANIES = require("../config/companies");

const local = COMPANIES[companyKey];
const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  // Start with build-time colors, then override with live data from the server.
  const [brand, setBrand] = useState({
    name: local.appName,
    logoUrl: null,
    primary: local.colors.primary,
    accent: local.colors.accent,
  });

  useEffect(() => {
    getCompanyProfile()
      .then((p) =>
        setBrand((b) => ({
          ...b,
          name: p.name || b.name,
          logoUrl: p.logoUrl || b.logoUrl,
          primary: p.primaryColor || b.primary,
          accent: p.accentColor || b.accent,
        }))
      )
      .catch(() => {}); // offline: keep local branding
  }, []);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);
