/** Hardcoded trending markers for map v1 (no backend field). */
export const TRENDING_COUNTRY_NAMES = new Set([
  "Japan",
  "Brazil",
  "Iceland",
  "Canada",
  "South Africa",
  "Peru",
]);

export function isTrendingCountry(name: string): boolean {
  return TRENDING_COUNTRY_NAMES.has(name);
}
