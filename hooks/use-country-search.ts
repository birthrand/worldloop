import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getCachedSearchResults,
  searchCountriesWithCache,
} from "@/lib/search-countries";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

const DEBOUNCE_MS = 300;
const RECENT_SEARCHES_KEY = "worldloop-recent-searches";
const MAX_RECENT_SEARCHES = 8;

type SearchStatus = "idle" | "loading" | "success" | "error";

export function useCountrySearch(enabled: boolean) {
  const query = useSearchUiStore((s) => s.query);
  const region = useSearchUiStore((s) => s.region);
  const submitNonce = useSearchUiStore((s) => s.submitNonce);
  const setQuery = useSearchUiStore((s) => s.setQuery);
  const setRegion = useSearchUiStore((s) => s.setRegion);

  const [results, setResults] = useState<Country[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef({ query: "", region: "" });
  const searchRequestIdRef = useRef(0);

  const loadRecentSearches = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [
        trimmed,
        ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (searchQuery: string, searchRegion: string | null) => {
      const q = searchQuery.trim();
      const r = searchRegion?.trim() ?? "";

      if (!q && !r) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }

      lastRequestRef.current = { query: q, region: r };
      const requestId = ++searchRequestIdRef.current;
      setError(null);

      const cached = await getCachedSearchResults(q, r);
      if (requestId !== searchRequestIdRef.current) return;

      let showedCached = false;
      if (cached) {
        showedCached = true;
        setResults(cached);
        setStatus("success");
      } else {
        setStatus("loading");
      }

      try {
        await searchCountriesWithCache(q, r, {
          onCached: (data) => {
            if (requestId !== searchRequestIdRef.current) return;
            showedCached = true;
            setResults(data);
            setStatus("success");
          },
          onFetched: (data) => {
            if (requestId !== searchRequestIdRef.current) return;
            setResults(data);
            setStatus("success");
          },
        });

        if (requestId !== searchRequestIdRef.current) return;
        if (q) void saveRecentSearch(q);
      } catch (err) {
        if (requestId !== searchRequestIdRef.current) return;
        if (!showedCached) {
          setResults([]);
          setStatus("error");
          setError(
            err instanceof Error ? err.message : "Search failed. Try again.",
          );
        }
      }
    },
    [saveRecentSearch],
  );

  const scheduleSearch = useCallback(
    (searchQuery: string, searchRegion: string | null, immediate = false) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const q = searchQuery.trim();
      const r = searchRegion?.trim() ?? "";
      if (!q && !r) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }

      if (immediate) {
        void runSearch(searchQuery, searchRegion);
        return;
      }

      debounceRef.current = setTimeout(() => {
        void runSearch(searchQuery, searchRegion);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  useEffect(() => {
    if (!enabled) return;
    void loadRecentSearches();
  }, [enabled, loadRecentSearches]);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setStatus("idle");
      setError(null);
      return;
    }

    scheduleSearch(query, region);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, query, region, scheduleSearch]);

  useEffect(() => {
    if (!enabled || submitNonce === 0) return;
    scheduleSearch(query, region, true);
  }, [enabled, query, region, scheduleSearch, submitNonce]);

  const handleRetry = useCallback(() => {
    const { query: q, region: r } = lastRequestRef.current;
    void runSearch(q, r || null);
  }, [runSearch]);

  const toggleRegion = useCallback(
    (next: string) => {
      setRegion(region === next ? null : next);
    },
    [region, setRegion],
  );

  const handleSubmit = useCallback(() => {
    scheduleSearch(query, region, true);
  }, [query, region, scheduleSearch]);

  const handleRecentTap = useCallback(
    (term: string) => {
      setQuery(term);
      scheduleSearch(term, region, true);
    },
    [region, scheduleSearch, setQuery],
  );

  const showIdle =
    status === "idle" && results.length === 0 && !query.trim() && !region;
  const showEmpty =
    status === "success" &&
    results.length === 0 &&
    (!!query.trim() || !!region);

  return {
    query,
    setQuery,
    region,
    setRegion,
    results,
    status,
    error,
    recentSearches,
    handleRetry,
    toggleRegion,
    handleSubmit,
    handleRecentTap,
    showIdle,
    showEmpty,
  };
}
