import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildFlagCdnUrl } from "@/lib/flag-url";
import type { Country } from "@/types/country";
import type { HistoryEntry } from "@/types/history";
import { historyEntryKey } from "@/types/history";
import type { PlaceFeedItem } from "@/types/place-feed";

const MAX_RECENT = 12;
const RECENTLY_VIEWED_STORAGE_VERSION = 2;

type LegacyRecentlyViewedEntry = {
  country: Country;
  viewedAt: number;
};

type RecentlyViewedState = {
  entries: HistoryEntry[];
  recordView: (country: Country) => void;
  recordLandmarkView: (item: PlaceFeedItem) => void;
  removeEntry: (key: string) => void;
  seedIfEmpty: () => void;
  clearRecentlyViewed: () => void;
};

function normalizeRecordedCountry(country: Country): Country | null {
  const wrapped = country as Country & { data?: Country };
  const normalized = wrapped.data ?? country;
  const name = normalized.name?.trim();

  if (!name) return null;
  return normalized;
}

function normalizeRecordedLandmarkItem(
  item: PlaceFeedItem,
): PlaceFeedItem | null {
  const landmarkId = item.landmark.id?.trim();
  const landmarkName = item.landmark.name?.trim();
  const country = normalizeRecordedCountry(item.country);

  if (!landmarkId || !landmarkName || !country) return null;

  return {
    landmark: { ...item.landmark, id: landmarkId, name: landmarkName },
    country,
  };
}

function normalizeHistoryEntry(entry: HistoryEntry): HistoryEntry | null {
  if (entry.kind === "country") {
    const country = normalizeRecordedCountry(entry.country);
    if (!country) return null;
    return {
      kind: "country",
      country,
      viewedAt: entry.viewedAt ?? Date.now(),
    };
  }

  const item = normalizeRecordedLandmarkItem(entry.item);
  if (!item) return null;
  return {
    kind: "landmark",
    item,
    viewedAt: entry.viewedAt ?? Date.now(),
  };
}

function sanitizeEntries(entries: HistoryEntry[]): HistoryEntry[] {
  const seen = new Set<string>();
  const cleaned: HistoryEntry[] = [];

  for (const entry of entries) {
    const normalized = normalizeHistoryEntry(entry);
    if (!normalized) continue;

    const key = historyEntryKey(normalized);
    if (seen.has(key)) continue;

    seen.add(key);
    cleaned.push(normalized);
  }

  return cleaned.slice(0, MAX_RECENT);
}

function seedCountry(
  name: string,
  cca2: string,
  capital: string,
  region: string,
  population: number,
  latlng: [number, number],
  images?: string[],
): Country {
  return {
    name,
    cca2,
    capital,
    region,
    population,
    flag: buildFlagCdnUrl(cca2),
    latlng,
    images,
  };
}

function buildSeedEntries(): HistoryEntry[] {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const peru = seedCountry(
    "Peru",
    "PE",
    "Lima",
    "South America",
    33_715_471,
    [-9.19, -75.0152],
    ["https://images.unsplash.com/photo-1526392060635-9d59825da76e?w=800"],
  );
  const italy = seedCountry(
    "Italy",
    "IT",
    "Rome",
    "Europe",
    58_853_482,
    [41.8719, 12.5674],
    ["https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800"],
  );
  const japan = seedCountry(
    "Japan",
    "JP",
    "Tokyo",
    "Asia",
    125_584_838,
    [36.2048, 138.2529],
    ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"],
  );

  return [
    {
      kind: "landmark",
      item: {
        landmark: {
          id: "seed-colosseum",
          name: "Colosseum",
          type: "monument",
          description: "Ancient Roman amphitheatre in Rome.",
          latitude: 41.8902,
          longitude: 12.4922,
          imageUrl:
            "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
          source: "wikidata",
        },
        country: italy,
      },
      viewedAt: now - 4 * HOUR,
    },
    { kind: "country", country: peru, viewedAt: now },
    { kind: "country", country: italy, viewedAt: now - 2 * HOUR },
    { kind: "country", country: japan, viewedAt: now - DAY },
  ];
}

function pushEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  const key = historyEntryKey(entry);
  const without = entries.filter(
    (existing) => historyEntryKey(existing) !== key,
  );
  return [entry, ...without].slice(0, MAX_RECENT);
}

function migrateLegacyEntries(
  entries: LegacyRecentlyViewedEntry[],
): HistoryEntry[] {
  return entries.map((entry) => ({
    kind: "country" as const,
    country: entry.country,
    viewedAt: entry.viewedAt,
  }));
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordView: (country: Country) => {
        const normalized = normalizeRecordedCountry(country);
        if (!normalized) return;

        set({
          entries: pushEntry(get().entries, {
            kind: "country",
            country: normalized,
            viewedAt: Date.now(),
          }),
        });
      },

      recordLandmarkView: (item: PlaceFeedItem) => {
        const normalized = normalizeRecordedLandmarkItem(item);
        if (!normalized) return;

        set({
          entries: pushEntry(get().entries, {
            kind: "landmark",
            item: normalized,
            viewedAt: Date.now(),
          }),
        });
      },

      removeEntry: (key: string) => {
        const trimmed = key.trim();
        if (!trimmed) return;
        set({
          entries: get().entries.filter(
            (entry) => historyEntryKey(entry) !== trimmed,
          ),
        });
      },

      seedIfEmpty: () => {
        if (get().entries.length === 0) {
          set({ entries: buildSeedEntries() });
        }
      },

      clearRecentlyViewed: () => set({ entries: [] }),
    }),
    {
      name: "worldloop-recently-viewed",
      version: RECENTLY_VIEWED_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as RecentlyViewedState;
        if (version < RECENTLY_VIEWED_STORAGE_VERSION) {
          const legacy = state.entries as LegacyRecentlyViewedEntry[];
          return {
            ...state,
            entries: migrateLegacyEntries(legacy),
          };
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.entries = sanitizeEntries(state.entries);
      },
    },
  ),
);
