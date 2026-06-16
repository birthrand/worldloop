/** Canonical bundled catalog name → alternate labels users may type or APIs emit. */
export const COUNTRY_NAME_ALIASES: Readonly<Record<string, readonly string[]>> =
  {
    "Cabo Verde": ["Cape Verde"],
  };

const ALIAS_TO_CANONICAL = new Map<string, string>();

for (const [canonical, aliases] of Object.entries(COUNTRY_NAME_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.trim().toLowerCase(), canonical);
  }
}

/** Map alternate labels (e.g. Cape Verde) to the bundled catalog name. */
export function resolveCountryCanonicalName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return ALIAS_TO_CANONICAL.get(trimmed.toLowerCase()) ?? trimmed;
}

/** Canonical name plus searchable aliases for one country row. */
export function getCountrySearchLabels(name: string): readonly string[] {
  const canonical = resolveCountryCanonicalName(name);
  const aliases = COUNTRY_NAME_ALIASES[canonical] ?? [];
  return [canonical, ...aliases];
}

const SUBSTRING_MIN_LEN = 3;

function rankSingleNameMatch(normalizedName: string, q: string): number | null {
  if (!q) return 0;
  if (normalizedName.startsWith(q)) return 0;
  if (q.length >= SUBSTRING_MIN_LEN && normalizedName.includes(q)) return 1;
  return null;
}

/** Best rank across canonical name and aliases (lower is better). */
export function rankCountrySearchMatch(
  countryName: string,
  query: string,
): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  let best: number | null = null;
  for (const label of getCountrySearchLabels(countryName)) {
    const rank = rankSingleNameMatch(label.toLowerCase(), q);
    if (rank !== null && (best === null || rank < best)) {
      best = rank;
    }
  }

  return best;
}

export function normalizeCountryRecord<T extends { name: string }>(
  country: T,
): T {
  const canonicalName = resolveCountryCanonicalName(country.name);
  if (canonicalName === country.name) return country;
  return { ...country, name: canonicalName };
}

/** Canonicalize names and dedupe rows that differ only by alias (e.g. Cape/Cabo Verde). */
export function normalizeSearchResults<T extends { name: string }>(
  countries: T[],
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const country of countries) {
    const normalized = normalizeCountryRecord(country);
    const key = normalized.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}
