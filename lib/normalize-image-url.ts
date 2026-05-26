const WIKIMEDIA_IMAGE_HOST = "upload.wikimedia.org";

/** Fix protocol-relative and missing-slashes URLs from Wikipedia/Wikimedia. */
export function normalizeImageUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) {
    value = `https:${value}`;
  }

  // e.g. http:upload.wikimedia.org/... → http://upload.wikimedia.org/...
  if (/^https?:[^/]/i.test(value)) {
    value = value.replace(/^(https?):/i, "$1://");
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.protocol = "https:";

    const host = url.hostname.toLowerCase();
    if (host === "upload.wikipedia.org") {
      url.hostname = WIKIMEDIA_IMAGE_HOST;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function isLikelyImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes("wikimedia.org")) {
      return path.includes("/thumb/") || /\.(jpe?g|png|webp|gif)$/i.test(path);
    }

    if (host.includes("unsplash.com") || host.includes("pexels.com")) {
      return true;
    }

    return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(path);
  } catch {
    return false;
  }
}

export function normalizeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    const normalized = normalizeImageUrl(raw);
    if (
      !normalized ||
      !isLikelyImageUrl(normalized) ||
      normalized.includes("flagcdn.com") ||
      seen.has(normalized)
    ) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

/** Strip raw URLs from AI copy so failed image URIs never appear as on-screen text. */
export function stripUrlsFromText(text: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\/\/upload\.wikimedia\.org\S*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned;
}
