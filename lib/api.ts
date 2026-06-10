import { API_BASE_URL } from "@/constants/api";
import { getHeroDisplayPixelWidth } from "@/lib/display-pixel-width";
import type { Country, MapCountry } from "@/types/country";

function appendHeroDisplayWidth(url: URL): void {
  url.searchParams.set("displayWidth", String(getHeroDisplayPixelWidth()));
}

export type FeedCountriesResponse = {
  data: Country[];
  nextCursor: string | null;
};

export type CultureFeedCountriesResponse = {
  data: Country[];
  nextCursor: string | null;
  meta: {
    total: number;
    seed: string;
  };
};

export async function fetchFeedCountries(
  cursor?: string,
  limit?: number,
): Promise<FeedCountriesResponse> {
  const url = new URL(`${API_BASE_URL}/feed/countries`);

  if (cursor !== undefined && cursor !== "") {
    url.searchParams.set("cursor", cursor);
  }
  if (limit !== undefined) {
    url.searchParams.set("limit", String(limit));
  }
  appendHeroDisplayWidth(url);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status})`);
  }

  return response.json() as Promise<FeedCountriesResponse>;
}

export async function fetchCultureFeedCountries(
  seed: string,
  cursor?: string,
  limit?: number,
): Promise<CultureFeedCountriesResponse> {
  const url = new URL(`${API_BASE_URL}/feed/culture/countries`);
  url.searchParams.set("seed", seed);

  if (cursor !== undefined && cursor !== "") {
    url.searchParams.set("cursor", cursor);
  }
  if (limit !== undefined) {
    url.searchParams.set("limit", String(limit));
  }
  appendHeroDisplayWidth(url);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Culture feed request failed (${response.status})`);
  }

  return response.json() as Promise<CultureFeedCountriesResponse>;
}

export type SearchCountriesResponse = {
  data: Country[];
  meta: {
    query: string | null;
    region: string | null;
    count: number;
  };
};

export async function fetchSearchCountries(
  query?: string,
  region?: string,
): Promise<SearchCountriesResponse> {
  const url = new URL(`${API_BASE_URL}/search`);
  const q = query?.trim() ?? "";
  const r = region?.trim() ?? "";

  if (!q && !r) {
    throw new Error("At least one of query or region is required");
  }

  if (q) url.searchParams.set("query", q);
  if (r) url.searchParams.set("region", r);
  appendHeroDisplayWidth(url);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Search request failed (${response.status})`);
  }

  return response.json() as Promise<SearchCountriesResponse>;
}

export type MapCountriesResponse = {
  data: MapCountry[];
};

export async function fetchMapCountries(): Promise<MapCountriesResponse> {
  const response = await fetch(`${API_BASE_URL}/map/countries`);

  if (!response.ok) {
    throw new Error(`Map countries request failed (${response.status})`);
  }

  return response.json() as Promise<MapCountriesResponse>;
}

export type DiscoverCountriesResponse = {
  data: MapCountry[];
  meta: {
    count: number;
    bbox: {
      west: number;
      south: number;
      east: number;
      north: number;
    };
    region: string | null;
    nextCursor: string | null;
  };
};

export type DiscoverCountriesParams = {
  west: number;
  south: number;
  east: number;
  north: number;
  centerLat?: number;
  centerLng?: number;
  region?: string;
  limit?: number;
  cursor?: string;
};

export async function fetchDiscoverCountries(
  params: DiscoverCountriesParams,
): Promise<DiscoverCountriesResponse> {
  const url = new URL(`${API_BASE_URL}/discover`);

  url.searchParams.set("west", String(params.west));
  url.searchParams.set("south", String(params.south));
  url.searchParams.set("east", String(params.east));
  url.searchParams.set("north", String(params.north));

  if (params.centerLat !== undefined) {
    url.searchParams.set("centerLat", String(params.centerLat));
  }
  if (params.centerLng !== undefined) {
    url.searchParams.set("centerLng", String(params.centerLng));
  }
  if (params.region) {
    url.searchParams.set("region", params.region);
  }
  if (params.limit !== undefined) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Discover request failed (${response.status})`);
  }

  return response.json() as Promise<DiscoverCountriesResponse>;
}

type CountryDetailResponse = {
  data: Country;
};

export async function fetchCountryByName(name: string): Promise<Country> {
  const encoded = encodeURIComponent(name.trim());
  const url = new URL(`${API_BASE_URL}/country/${encoded}`);
  appendHeroDisplayWidth(url);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Country request failed (${response.status})`);
  }

  const payload = (await response.json()) as CountryDetailResponse;
  return payload.data;
}

export type CountryExplorerNews = {
  eventsSummary: string;
  trending: Array<{
    id: string;
    title: string;
    topic:
      | "tech"
      | "sports"
      | "food"
      | "tourism"
      | "culture"
      | "economy"
      | "general";
  }>;
  sources?: Array<{ title: string; url: string; publishedAt: string }>;
  updatedAt: string;
};

export type CountryWikipediaSummary = {
  title: string;
  extract: string;
  description: string | null;
  pageUrl: string;
  thumbnailUrl: string | null;
};

export type CountryExplorerResponse = {
  data: {
    country: Country;
    explorer: CountryExplorerNews;
    wikipedia: CountryWikipediaSummary | null;
  };
};

export async function fetchCountryExplorer(
  name: string,
): Promise<CountryExplorerResponse["data"]> {
  const encoded = encodeURIComponent(name.trim());
  const url = new URL(`${API_BASE_URL}/country/${encoded}/explorer`);
  appendHeroDisplayWidth(url);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Country explorer request failed (${response.status})`);
  }

  const payload = (await response.json()) as CountryExplorerResponse;
  return payload.data;
}

export type LandmarkSource = "wikidata" | "osm" | "wikipedia";

export type CountryLandmark = {
  id: string;
  name: string;
  type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  source: LandmarkSource;
};

export type CountryProfileResponse = {
  data: {
    country: Country;
    wikipedia: CountryWikipediaSummary | null;
    landmarks: CountryLandmark[];
  };
};

export async function fetchCountryProfile(
  name: string,
): Promise<CountryProfileResponse["data"]> {
  const encoded = encodeURIComponent(name.trim());
  const url = new URL(`${API_BASE_URL}/country/${encoded}/profile`);
  appendHeroDisplayWidth(url);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Country profile request failed (${response.status})`);
  }

  const payload = (await response.json()) as CountryProfileResponse;
  return payload.data;
}
