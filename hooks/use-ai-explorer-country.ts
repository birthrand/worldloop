import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { NIGERIA_FALLBACK_COUNTRY } from "@/data/ai-explorer-content";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import {
  getCachedCountryProfile,
  hydrateCountryProfileFromDisk,
  isCountryProfileEnriched,
  seedCachedCountryProfile,
  seedStaticCountryProfileIfAvailable,
} from "@/lib/country-profile-cache";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import {
  getStaticCountryByName,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import {
  getStaticCountryProfileByName,
  isStaticCountryProfileCatalogEnabled,
  isStaticCountryProfileEnriched,
} from "@/lib/static-country-profiles";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

type UseAiExplorerCountryResult = {
  country: Country;
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
  /** True only when there is no cached/feed/static data to show yet. */
  loading: boolean;
  /** Background refresh while stale content is visible. */
  refreshing: boolean;
  error: string | null;
};

type ResolvedProfile = {
  country: Country;
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
};

function resolveCountry(
  targetName: string,
  feedMatch: Country | null | undefined,
): Country {
  const cached = getCachedCountryProfile(targetName)?.country;
  if (cached) return cached;
  if (feedMatch) return feedMatch;

  if (isStaticCountryCatalogEnabled()) {
    return getStaticCountryByName(targetName) ?? NIGERIA_FALLBACK_COUNTRY;
  }

  return NIGERIA_FALLBACK_COUNTRY;
}

function resolveEnrichment(targetName: string): {
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
} {
  const cached = getCachedCountryProfile(targetName);
  if (cached) {
    return {
      wikipedia: cached.wikipedia,
      landmarks: cached.landmarks,
    };
  }

  const staticProfile = getStaticCountryProfileByName(targetName);
  if (staticProfile) {
    return {
      wikipedia: staticProfile.wikipedia,
      landmarks: staticProfile.landmarks,
    };
  }

  return { wikipedia: null, landmarks: [] };
}

function resolveProfile(
  targetName: string,
  feedMatch: Country | null | undefined,
): ResolvedProfile {
  seedStaticCountryProfileIfAvailable(
    targetName,
    feedMatch ?? getStaticCountryByName(targetName) ?? undefined,
  );

  if (feedMatch) {
    seedCachedCountryProfile(feedMatch);
  }

  const country = resolveCountry(targetName, feedMatch);
  const enrichment = resolveEnrichment(targetName);

  return {
    country,
    wikipedia: enrichment.wikipedia,
    landmarks: enrichment.landmarks,
  };
}

function hasImmediateOverview(
  country: Country,
  wikipedia: CountryWikipediaSummary | null,
): boolean {
  return Boolean(
    wikipedia?.extract?.trim() ||
    country.ai?.caption?.trim() ||
    country.ai?.fact?.trim(),
  );
}

function hasResolvableCountry(
  targetName: string,
  feedMatch: Country | null | undefined,
): boolean {
  return Boolean(
    getCachedCountryProfile(targetName)?.country ||
    feedMatch ||
    (isStaticCountryCatalogEnabled() && getStaticCountryByName(targetName)),
  );
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
    () => resolveProfile(targetName, feedMatch),
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
    () => !hasResolvableCountry(targetName, feedMatch),
  );
  const [refreshing, setRefreshing] = useState(false);
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

    const syncFromCache = (): ResolvedProfile => {
      const profile = resolveProfile(targetName, feedMatch);
      setCountry(profile.country);
      setWikipedia(profile.wikipedia);
      setLandmarks(profile.landmarks);
      setLoading(false);
      setError(null);
      return profile;
    };

    const profile = syncFromCache();

    void hydrateCountryProfileFromDisk(targetName).then(() => {
      if (cancelled) return;
      syncFromCache();
    });

    const needsNetwork =
      !(
        isStaticCountryProfileCatalogEnabled() &&
        isStaticCountryProfileEnriched(targetName)
      ) &&
      !isCountryProfileEnriched(
        getCachedCountryProfile(targetName),
        targetName,
      );

    if (!needsNetwork) {
      setRefreshing(false);
      return () => {
        cancelled = true;
      };
    }

    setRefreshing(!hasImmediateOverview(profile.country, profile.wikipedia));

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
