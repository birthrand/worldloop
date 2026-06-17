import type {
  TravelMapCountryPinCategory,
  TravelMapLandmarkPinCategory,
  TravelMapLegendVisibility,
} from "@/constants/travel-map-legend";
import { resolveTravelMapCountryDisplayCategory } from "@/constants/travel-map-legend";
import { resolveVisitCountryId } from "@/lib/discovery-progress";
import {
  cca2FromFlagUrl,
  countryToMapCountry,
  isValidLatLng,
} from "@/lib/map-country";
import {
  getStaticCountries,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import type { MapCountry } from "@/types/country";
import type { HistoryEntry } from "@/types/history";
import type { MapLandmarkFocus } from "@/types/map-presentation";
import type { PlaceFeedItem } from "@/types/place-feed";

export type TravelMapLandmarkPin = MapLandmarkFocus & {
  category: TravelMapLandmarkPinCategory;
  countryName: string;
};

export type TravelMapPinData = {
  countries: MapCountry[];
  categoryByCountryName: Record<string, TravelMapCountryPinCategory>;
  categoriesByCountryName: Record<string, TravelMapCountryPinCategory[]>;
  landmarkPins: TravelMapLandmarkPin[];
  allowedCountryNames: Set<string>;
  allowedLandmarkIds: Set<string>;
};

function buildCountryLookup(countries: MapCountry[]): Map<string, MapCountry> {
  const byId = new Map<string, MapCountry>();

  for (const country of countries) {
    const visitInput = {
      name: country.name,
      cca2: cca2FromFlagUrl(country.flag) ?? "",
      flag: country.flag,
    };
    const id = resolveVisitCountryId(visitInput);
    if (id && !byId.has(id)) {
      byId.set(id, country);
    }
    const name = country.name.trim();
    if (name && !byId.has(name)) {
      byId.set(name, country);
    }
  }

  return byId;
}

function resolveMapCountry(
  country: {
    name: string;
    latlng?: [number, number];
    cca2?: string;
    flag?: string;
  },
  lookup: Map<string, MapCountry>,
): MapCountry | null {
  const fromLookup = lookup.get(country.name.trim());
  const candidate =
    fromLookup ??
    (isValidLatLng(country.latlng ?? [0, 0])
      ? ({
          name: country.name,
          capital: "",
          region: "",
          population: 0,
          flag: country.flag ?? "",
          latlng: country.latlng as [number, number],
          image: null,
        } satisfies MapCountry)
      : null);
  if (!candidate || !isValidLatLng(candidate.latlng)) {
    return null;
  }
  return candidate;
}

function resolveLandmarkPin(
  item: PlaceFeedItem,
  category: TravelMapLandmarkPinCategory,
): TravelMapLandmarkPin | null {
  const { latitude, longitude, id, name } = item.landmark;
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !id?.trim() ||
    !name?.trim()
  ) {
    return null;
  }

  return {
    id: id.trim(),
    name: name.trim(),
    latitude,
    longitude,
    category,
    countryName: item.country.name.trim(),
  };
}

function addCountryCategory(
  categoriesByName: Record<string, TravelMapCountryPinCategory[]>,
  categoryByName: Record<string, TravelMapCountryPinCategory>,
  countryName: string,
  category: TravelMapCountryPinCategory,
): void {
  const name = countryName.trim();
  if (!name) return;

  const categories = categoriesByName[name] ?? [];
  if (!categories.includes(category)) {
    categoriesByName[name] = [...categories, category];
  }

  const displayCategory = resolveTravelMapCountryDisplayCategory(
    categoriesByName[name],
  );
  if (displayCategory) {
    categoryByName[name] = displayCategory;
  }
}

function collectTravelMapPins(input: {
  feedCountries: MapCountry[];
  savedCountries: MapCountry[];
  savedLandmarks: PlaceFeedItem[];
  historyEntries: HistoryEntry[];
  visitedCountryIds: string[];
  visitedCountryById: Record<
    string,
    { name: string; cca2?: string; flag?: string }
  >;
}): TravelMapPinData {
  const catalogCountries = isStaticCountryCatalogEnabled()
    ? getStaticCountries().map((country) => countryToMapCountry(country))
    : [];

  const lookup = buildCountryLookup([
    ...input.feedCountries,
    ...catalogCountries,
    ...input.savedCountries,
  ]);

  const categoryByCountryName: Record<string, TravelMapCountryPinCategory> = {};
  const categoriesByCountryName: Record<string, TravelMapCountryPinCategory[]> =
    {};
  const countries: MapCountry[] = [];
  const seenCountries = new Set<string>();
  const landmarkPins: TravelMapLandmarkPin[] = [];
  const seenLandmarks = new Set<string>();

  for (const id of input.visitedCountryIds) {
    const snapshot = input.visitedCountryById[id];
    const fromLookup =
      lookup.get(id) ??
      (snapshot?.name ? lookup.get(snapshot.name.trim()) : null);
    const country = fromLookup
      ? resolveMapCountry(fromLookup, lookup)
      : snapshot?.name
        ? resolveMapCountry(snapshot, lookup)
        : null;
    if (!country || seenCountries.has(country.name)) continue;

    seenCountries.add(country.name);
    countries.push(country);
    addCountryCategory(
      categoriesByCountryName,
      categoryByCountryName,
      country.name,
      "visited",
    );
  }

  for (const country of input.savedCountries) {
    const resolved = resolveMapCountry(country, lookup);
    if (!resolved) continue;

    if (!seenCountries.has(resolved.name)) {
      seenCountries.add(resolved.name);
      countries.push(resolved);
    }
    addCountryCategory(
      categoriesByCountryName,
      categoryByCountryName,
      resolved.name,
      "savedPlace",
    );
  }

  for (const item of input.savedLandmarks) {
    const pin = resolveLandmarkPin(item, "savedLandmark");
    if (!pin || seenLandmarks.has(pin.id)) continue;

    seenLandmarks.add(pin.id);
    landmarkPins.push(pin);
  }

  for (const entry of input.historyEntries) {
    if (entry.kind === "country") {
      const resolved = resolveMapCountry(entry.country, lookup);
      if (!resolved) continue;

      if (!seenCountries.has(resolved.name)) {
        seenCountries.add(resolved.name);
        countries.push(resolved);
      }
      addCountryCategory(
        categoriesByCountryName,
        categoryByCountryName,
        resolved.name,
        "recentlyViewed",
      );
      continue;
    }

    const pin = resolveLandmarkPin(entry.item, "recentlyViewed");
    if (!pin || seenLandmarks.has(pin.id)) continue;

    seenLandmarks.add(pin.id);
    landmarkPins.push(pin);
  }

  const allowedCountryNames = new Set(countries.map((country) => country.name));
  const allowedLandmarkIds = new Set(landmarkPins.map((pin) => pin.id));

  return {
    countries,
    categoryByCountryName,
    categoriesByCountryName,
    landmarkPins,
    allowedCountryNames,
    allowedLandmarkIds,
  };
}

/** Snapshot travel-map pins from current stores (for map logic + legend). */
export function getTravelMapPinData(): TravelMapPinData {
  const discovery = useDiscoveryProgressStore.getState();
  const saved = useSavedCountriesStore.getState();
  const landmarks = useSavedLandmarksStore.getState();
  const history = useRecentlyViewedStore.getState();

  return collectTravelMapPins({
    feedCountries: useCountryFeedStore
      .getState()
      .countries.map(countryToMapCountry),
    savedCountries: saved.savedCountries.map(countryToMapCountry),
    savedLandmarks: landmarks.savedLandmarks,
    historyEntries: history.entries,
    visitedCountryIds: discovery.visitedCountryIds,
    visitedCountryById: discovery.visitedCountryById,
  });
}

export function isTravelMapCountryAllowed(
  countryName: string,
  allowedNames: Set<string>,
): boolean {
  return allowedNames.has(countryName.trim());
}

export function isTravelMapLandmarkAllowed(
  landmarkId: string,
  allowedIds: Set<string>,
): boolean {
  return allowedIds.has(landmarkId.trim());
}

export function filterTravelMapPinData(
  data: TravelMapPinData,
  visibility: TravelMapLegendVisibility,
): TravelMapPinData {
  const visibleCountries = data.countries.filter((country) => {
    const categories = data.categoriesByCountryName[country.name] ?? [];
    return categories.some((category) => visibility[category]);
  });

  const categoryByCountryName: Record<string, TravelMapCountryPinCategory> = {};
  const categoriesByCountryName: Record<string, TravelMapCountryPinCategory[]> =
    {};

  for (const country of visibleCountries) {
    const categories = data.categoriesByCountryName[country.name] ?? [];
    categoriesByCountryName[country.name] = categories;

    const displayCategory = resolveTravelMapCountryDisplayCategory(
      categories,
      visibility,
    );
    if (displayCategory) {
      categoryByCountryName[country.name] = displayCategory;
    }
  }

  const landmarkPins = data.landmarkPins.filter(
    (pin) => visibility[pin.category],
  );

  return {
    countries: visibleCountries,
    categoryByCountryName,
    categoriesByCountryName,
    landmarkPins,
    allowedCountryNames: new Set(
      visibleCountries.map((country) => country.name),
    ),
    allowedLandmarkIds: new Set(landmarkPins.map((pin) => pin.id)),
  };
}

export function resolveTravelMapLandmarkFeedItem(
  pin: TravelMapLandmarkPin,
): PlaceFeedItem | null {
  const savedItem = useSavedLandmarksStore
    .getState()
    .savedLandmarks.find((item) => item.landmark.id === pin.id);
  if (savedItem) {
    return savedItem;
  }

  for (const entry of useRecentlyViewedStore.getState().entries) {
    if (entry.kind === "landmark" && entry.item.landmark.id === pin.id) {
      return entry.item;
    }
  }

  const feedCountry =
    useCountryFeedStore
      .getState()
      .countries.find((country) => country.name === pin.countryName) ??
    useSavedCountriesStore
      .getState()
      .savedCountries.find((country) => country.name === pin.countryName) ??
    null;

  if (!feedCountry) {
    return null;
  }

  return {
    country: feedCountry,
    landmark: {
      id: pin.id,
      name: pin.name,
      latitude: pin.latitude,
      longitude: pin.longitude,
      imageUrl: null,
      type: "Landmark",
      description: "",
      source: "wikipedia",
    },
  };
}
