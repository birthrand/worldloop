import { getAiFact } from "@/lib/format-country";
import type { Country } from "@/types/country";

const DESCRIPTION_FALLBACKS: Record<string, string> = {
  Peru: "Land of ancient wonders, vibrant culture, and breathtaking landscapes.",
  Japan: "Where tradition meets the future in harmony.",
  Iceland: "Fire and ice unite in a land of raw natural beauty.",
  "New Zealand": "Adventure awaits amidst stunning fjords and Maori culture.",
  Italy: "A feast for the senses with art, history, and cuisine.",
  Morocco: "Vibrant souks, majestic dunes, and ancient medinas.",
  Canada: "Vast wilderness and cosmopolitan cities await.",
};

export function getSavedCountryDescription(
  country: Country,
  maxLength = 90,
): string {
  const aiFact = getAiFact(country);
  const raw =
    aiFact === "Fun fact loading…"
      ? (DESCRIPTION_FALLBACKS[country.name] ??
        "Discover culture, landscapes, and stories worth saving.")
      : aiFact;

  if (raw.length <= maxLength) return raw;
  if (maxLength <= 0) return "";
  return `${raw.slice(0, maxLength - 1).trimEnd()}…`;
}
