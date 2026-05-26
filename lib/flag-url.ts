/** REST Countries uses flagcdn — flags must never come from photo providers. */
export function resolveFlagCdnUrl(flag: string, iso2?: string): string | null {
  const value = flag.trim();

  if (iso2?.trim().length === 2 && !/flagcdn\.com/i.test(value)) {
    return buildFlagCdnUrl(iso2);
  }

  if (!value || !/flagcdn\.com/i.test(value)) {
    return null;
  }

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!url.hostname.toLowerCase().includes("flagcdn.com")) {
      return null;
    }
    url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
}

export function buildFlagCdnUrl(iso2: string, width = 320): string {
  return `https://flagcdn.com/w${width}/${iso2.toLowerCase()}.png`;
}
