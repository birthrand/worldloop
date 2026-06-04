import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { NIGERIA_FALLBACK_COUNTRY } from "@/data/ai-explorer-content";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import {
  getCachedCountryProfile,
  hydrateCountryProfileFromDisk,
  isCountryProfileEnriched,
  seedCachedCountryProfile,
} from "@/lib/country-profile-cache";
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

export function useAiExplorerCountry(): UseAiExplorerCountryResult {
  const { name } = useLocalSearchParams<{ name: string }>();
  const routeName =
    typeof name === "string" ? decodeURIComponent(name).trim() : "";

  const feedCountries = useCountryFeedStore((s) => s.countries);
  const currentCountry = useCountryFeedStore((s) => s.getCurrentCountry());

  const feedMatch = useMemo(() => {
    if (!routeName) return currentCountry;
    return (
      feedCountries.find(
        (item) => item.name.toLowerCase() === routeName.toLowerCase(),
      ) ?? currentCountry
    );
  }, [currentCountry, feedCountries, routeName]);

  const targetName =
    routeName || feedMatch?.name || NIGERIA_FALLBACK_COUNTRY.name;

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
    () => !getCachedCountryProfile(targetName) && !feedMatch,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (feedMatch) {
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
    }
  }, [feedMatch]);

  useEffect(() => {
    let cancelled = false;

    const applyProfile = (
      profile: ReturnType<typeof getCachedCountryProfile>,
    ) => {
      if (!profile) return;
      setCountry(profile.country);
      setWikipedia(profile.wikipedia);
      setLandmarks(profile.landmarks);
      if (isCountryProfileEnriched(profile)) {
        setLoading(false);
        setRefreshing(false);
      }
    };

    const cached = getCachedCountryProfile(targetName);
    if (cached) {
      applyProfile(cached);
    } else {
      setLandmarks([]);
      setWikipedia(null);
      if (feedMatch?.name.toLowerCase() === targetName.toLowerCase()) {
        setCountry(feedMatch);
      }
    }

    void hydrateCountryProfileFromDisk(targetName).then((profile) => {
      if (cancelled) return;
      applyProfile(profile ?? getCachedCountryProfile(targetName));
    });

    return () => {
      cancelled = true;
    };
  }, [targetName, feedMatch]);

  useEffect(() => {
    let cancelled = false;

    const memoryCached = getCachedCountryProfile(targetName);
    const hasEnrichedCache = isCountryProfileEnriched(memoryCached);
    const hasInstantData = hasEnrichedCache || Boolean(feedMatch);

    if (hasEnrichedCache) {
      setLoading(false);
      setRefreshing(false);
    } else if (hasInstantData) {
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    setError(null);

    void (async () => {
      await hydrateCountryProfileFromDisk(targetName);
      if (cancelled) return;

      const hydrated = getCachedCountryProfile(targetName);
      if (hydrated && isCountryProfileEnriched(hydrated)) {
        setCountry(hydrated.country);
        setWikipedia(hydrated.wikipedia);
        setLandmarks(hydrated.landmarks);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      await prefetchCountryProfile(targetName);
      if (cancelled) return;

      const cached = getCachedCountryProfile(targetName);
      if (cached && isCountryProfileEnriched(cached)) {
        setCountry(cached.country);
        setWikipedia(cached.wikipedia);
        setLandmarks(cached.landmarks);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      if (cached) {
        setCountry(cached.country);
        setWikipedia(cached.wikipedia);
        setLandmarks(cached.landmarks);
      } else if (feedMatch) {
        setCountry(feedMatch);
      } else if (targetName.toLowerCase() === "nigeria") {
        setCountry(NIGERIA_FALLBACK_COUNTRY);
      } else {
        setCountry({
          ...NIGERIA_FALLBACK_COUNTRY,
          name: targetName,
          capital: "—",
          region: "—",
          cca2: "UN",
          flag: "",
        });
      }

      setWikipedia(cached?.wikipedia ?? null);
      setLandmarks(cached?.landmarks ?? []);
      setError(null);
      setLoading(false);
      setRefreshing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [feedMatch, targetName]);

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
