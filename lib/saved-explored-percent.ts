import type { Country } from "@/types/country";

/** Design-matched exploration percents for seeded saved countries. */
const DESIGN_PERCENTS: Record<string, number> = {
  Peru: 28,
  Japan: 10,
  Iceland: 15,
  "New Zealand": 5,
};

/** Teachable v1 — design stubs for seed data, visit-based fallback otherwise. */
export function getCountryExploredPercent(
  country: Country,
  isVisited: boolean,
): number {
  const designPercent = DESIGN_PERCENTS[country.name];
  if (designPercent != null) return designPercent;
  if (!isVisited) return 0;
  return 12;
}
