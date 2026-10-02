// src/hooks/useListLoader.js — load / refresh state shared by every list screen.
import { useCallback, useEffect, useState } from "react";
import { unwrapList } from "../utils/helpers";

export function useListLoader(fetcher, errorMessage = "Could not load data.") {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetcher();
      setItems(unwrapList(res.data));
    } catch (e) {
      setError(e.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { items, loading, refreshing, error, refresh, reload: load };
}
