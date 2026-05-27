import { API_BASE_URL } from "@/constants/api";
import type { Country, MapCountry } from "@/types/country";

export type FeedCountriesResponse = {
  data: Country[];
  nextCursor: string | null;
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

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status})`);
  }

  return response.json() as Promise<FeedCountriesResponse>;
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

type CountryDetailResponse = {
  data: Country;
};

export async function fetchCountryByName(name: string): Promise<Country> {
  const encoded = encodeURIComponent(name.trim());
  const response = await fetch(`${API_BASE_URL}/country/${encoded}`);

  if (!response.ok) {
    throw new Error(`Country request failed (${response.status})`);
  }

  const payload = (await response.json()) as CountryDetailResponse;
  return payload.data;
}
