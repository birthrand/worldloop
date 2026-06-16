/** Canonical catalog name → alternate labels users may type or APIs emit. */
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

export function resolveCountryCanonicalName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return ALIAS_TO_CANONICAL.get(trimmed.toLowerCase()) ?? trimmed;
}

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
