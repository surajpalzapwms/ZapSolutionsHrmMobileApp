// src/hooks/useListLoader.js — load / refresh state shared by every list screen.
// Fast reopen: the last result is kept in memory (per screen, per logged-in
// user — cleared on logout). Opening a sheet again shows that list at once
// and refreshes it quietly in the background.
import { useCallback, useEffect, useRef, useState } from "react";
import { unwrapList } from "../utils/helpers";
import { cacheGet, cacheSet } from "../utils/appCache";

export function useListLoader(fetcher, errorMessage = "Could not load data.", cacheKey) {
  // Same screen + same request code → same key. Every fetcher here depends
  // only on the logged-in user, which is fixed until logout.
  const keyRef = useRef(cacheKey || `list:${errorMessage}:${String(fetcher)}`);
  const cached = cacheGet(keyRef.current);

  const [items, setItems] = useState(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetchRef.current();
      const list = unwrapList(res.data);
      cacheSet(keyRef.current, list);
      setItems(list);
    } catch (e) {
      // Keep showing the cached list if the refresh fails.
      if (!cacheGet(keyRef.current)) setError(e.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { items, loading, refreshing, error, refresh, reload: load };
}
