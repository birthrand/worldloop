import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

export type HistoryCountryEntry = {
  kind: "country";
  country: Country;
  viewedAt: number;
};

export type HistoryLandmarkEntry = {
  kind: "landmark";
  item: PlaceFeedItem;
  viewedAt: number;
};

export type HistoryEntry = HistoryCountryEntry | HistoryLandmarkEntry;

export function historyEntryKey(entry: HistoryEntry): string {
  if (entry.kind === "country") {
    return `country:${entry.country.name.trim()}`;
  }
  return `landmark:${entry.item.landmark.id}`;
}

export function historyEntryThumbnail(entry: HistoryEntry): string | null {
  if (entry.kind === "landmark") {
    return (
      entry.item.landmark.imageUrl ??
      entry.item.country.images?.[0] ??
      entry.item.country.flag ??
      null
    );
  }
  return entry.country.images?.[0] ?? entry.country.flag ?? null;
}
