import { API_BASE_URL } from "@/constants/api";
import type { Country } from "@/types/country";

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
