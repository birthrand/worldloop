import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { NIGERIA_FALLBACK_COUNTRY } from "@/data/ai-explorer-content";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import {
  getCachedCountryProfile,
  hydrateCountryProfileFromDisk,
  isCountryProfileEnriched,
  seedCachedCountryProfile,
} from "@/lib/country-profile-cache";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

type UseAiExplorerCountryResult = {
  country: Country;
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
  /** True only when there is no cached/feed data to show yet. */
  loading: boolean;
  /** Background refresh while stale content is visible. */
  refreshing: boolean;
  error: string | null;
};

function resolveInitialProfile(
  routeName: string,
  feedMatch: Country | null | undefined,
): {
  country: Country;
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
} {
  const cached = routeName ? getCachedCountryProfile(routeName) : undefined;
  if (cached) {
    return {
      country: cached.country,
      wikipedia: cached.wikipedia,
      landmarks: cached.landmarks,
    };
  }
  if (feedMatch) {
    seedCachedCountryProfile(feedMatch);
    return { country: feedMatch, wikipedia: null, landmarks: [] };
  }
  return {
    country: NIGERIA_FALLBACK_COUNTRY,
    wikipedia: null,
    landmarks: [],
  };
}

function applyCachedProfile(
  targetName: string,
  feedMatch: Country | null | undefined,
): ReturnType<typeof resolveInitialProfile> {
  const cached = getCachedCountryProfile(targetName);
  if (cached) {
    return {
      country: cached.country,
      wikipedia: cached.wikipedia,
      landmarks: cached.landmarks,
    };
  }

  if (feedMatch?.name.toLowerCase() === targetName.toLowerCase()) {
    return { country: feedMatch, wikipedia: null, landmarks: [] };
  }

  return resolveInitialProfile(targetName, feedMatch);
}

export function useAiExplorerCountry(): UseAiExplorerCountryResult {
  const { name } = useLocalSearchParams<{ name: string }>();
  const routeName =
    typeof name === "string" ? decodeURIComponent(name).trim() : "";

  const feedCountries = useCountryFeedStore((s) => s.countries);

  const feedMatch = useMemo(() => {
    if (!routeName) return null;
    return (
      feedCountries.find(
        (item) => item.name.toLowerCase() === routeName.toLowerCase(),
      ) ?? null
    );
  }, [feedCountries, routeName]);

  const targetName = routeName || NIGERIA_FALLBACK_COUNTRY.name;

  const initial = useMemo(
    () => resolveInitialProfile(targetName, feedMatch),
    [targetName, feedMatch],
  );

  const [country, setCountry] = useState<Country>(initial.country);
  const [wikipedia, setWikipedia] = useState<CountryWikipediaSummary | null>(
    initial.wikipedia,
  );
  const [landmarks, setLandmarks] = useState<CountryLandmark[]>(
    initial.landmarks,
  );
  const [loading, setLoading] = useState(
    () =>
      !isCountryProfileEnriched(getCachedCountryProfile(targetName)) &&
      !feedMatch,
  );
  const [refreshing, setRefreshing] = useState(
    () => !getCachedCountryProfile(targetName)?.wikipedia?.extract?.trim(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedMatch) return;

    seedCachedCountryProfile(feedMatch);
    setCountry((prev) => {
      if (prev.name.toLowerCase() !== feedMatch.name.toLowerCase()) {
        return feedMatch;
      }
      return {
        ...feedMatch,
        images: feedMatch.images?.length ? feedMatch.images : prev.images,
        ai: feedMatch.ai ?? prev.ai,
      };
    });
    setLoading(false);
  }, [feedMatch]);

  useEffect(() => {
    let cancelled = false;

    const syncFromCache = () => {
      const profile = applyCachedProfile(targetName, feedMatch);
      setCountry(profile.country);
      setWikipedia(profile.wikipedia);
      setLandmarks(profile.landmarks);

      setLoading(false);
      setError(null);
    };

    const needsWikipedia =
      !getCachedCountryProfile(targetName)?.wikipedia?.extract?.trim();

    syncFromCache();
    if (needsWikipedia) {
      setRefreshing(true);
    }

    void hydrateCountryProfileFromDisk(targetName).then(() => {
      if (cancelled) return;
      syncFromCache();
    });

    void prefetchCountryProfile(targetName).finally(() => {
      if (cancelled) return;
      syncFromCache();
      setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [targetName, feedMatch]);

  const landmarksForCountry = useMemo(
    () =>
      country.name.toLowerCase() === targetName.toLowerCase() ? landmarks : [],
    [country.name, landmarks, targetName],
  );

  return {
    country,
    wikipedia,
    landmarks: landmarksForCountry,
    loading,
    refreshing,
    error,
  };
}
