import { useMemo } from "react";

import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import type { Country } from "@/types/country";
import type { HistoryEntry } from "@/types/history";
import type { PlaceFeedItem } from "@/types/place-feed";

function mergeCountryFromFeed(
  country: Country,
  feedCountries: Country[],
): Country {
  const match = feedCountries.find((c) => c.name === country.name);
  return match ?? country;
}

function enrichLandmarkItem(
  item: PlaceFeedItem,
  feedCountries: Country[],
): PlaceFeedItem {
  return {
    ...item,
    country: mergeCountryFromFeed(item.country, feedCountries),
  };
}

export function useRecentHistoryList(): HistoryEntry[] {
  const entries = useRecentlyViewedStore((s) => s.entries);
  const feedCountries = useCountryFeedStore((s) => s.countries);

  return useMemo(() => {
    return entries.map((entry) => {
      if (entry.kind === "country") {
        return {
          ...entry,
          country: mergeCountryFromFeed(entry.country, feedCountries),
        };
      }

      return {
        ...entry,
        item: enrichLandmarkItem(entry.item, feedCountries),
      };
    });
  }, [entries, feedCountries]);
}
