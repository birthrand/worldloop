/**
 * Resolves Wikimedia Commons Special:FilePath URLs to direct upload.wikimedia.org
 * thumb URLs at build time so mobile previews skip redirect hops.
 */

export const COMMONS_THUMB_WIDTH = 640;

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const RESOLVE_USER_AGENT =
  "WorldLoop/1.0 (country profile build; learning project)";

const RESOLVE_TIMEOUT_MS = 20_000;
const API_BATCH_SIZE = 25;
const API_BATCH_DELAY_MS = 300;
const REDIRECT_DELAY_MS = 150;
const MAX_RETRIES = 3;

const resolveCache = new Map<string, string>();

export function isCommonsFilePathUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return (
    url.includes("commons.wikimedia.org") && url.includes("Special:FilePath")
  );
}

function normalizeHttpsUrl(url: string): string {
  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }
  return url;
}

function normalizeFileName(name: string): string {
  return decodeURIComponent(name).replace(/ /g, "_").toLowerCase();
}

export function parseCommonsFilePathUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/Special:FilePath/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function withThumbWidth(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("width")) {
      parsed.searchParams.set("width", String(width));
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type CommonsImageInfoPage = {
  title?: string;
  missing?: boolean;
  imageinfo?: Array<{ thumburl?: string; url?: string }>;
};

type CommonsImageInfoResponse = {
  query?: {
    pages?: Record<string, CommonsImageInfoPage>;
  };
};

async function resolveBatchViaCommonsApi(
  fileNames: string[],
  width: number,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  if (fileNames.length === 0) return results;

  const body = new URLSearchParams({
    action: "query",
    titles: fileNames.map((name) => `File:${name}`).join("|"),
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(width),
    format: "json",
  });

  const response = await fetch(COMMONS_API, {
    method: "POST",
    headers: {
      "User-Agent": RESOLVE_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
  });

  if (!response.ok) return results;

  const data = (await response.json()) as CommonsImageInfoResponse;
  const pages = data.query?.pages ?? {};

  for (const page of Object.values(pages)) {
    if (page.missing || !page.title?.startsWith("File:")) continue;

    const fileName = page.title.slice("File:".length);
    const imageUrl =
      page.imageinfo?.[0]?.thumburl?.trim() ||
      page.imageinfo?.[0]?.url?.trim() ||
      null;

    if (!imageUrl?.includes("upload.wikimedia.org")) continue;
    results.set(normalizeFileName(fileName), normalizeHttpsUrl(imageUrl));
  }

  return results;
}

async function resolveViaRedirect(
  url: string,
  width: number,
): Promise<string | null> {
  const requestUrl = withThumbWidth(url, width);

  try {
    const response = await fetch(requestUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": RESOLVE_USER_AGENT },
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
    });

    if (response.ok) {
      const finalUrl = normalizeHttpsUrl(response.url);
      if (finalUrl.includes("upload.wikimedia.org")) return finalUrl;
    }
  } catch {
    // try GET below
  }

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": RESOLVE_USER_AGENT },
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
    });

    if (response.ok) {
      const finalUrl = normalizeHttpsUrl(response.url);
      if (finalUrl.includes("upload.wikimedia.org")) return finalUrl;
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveCommonsFilePathUrl(
  url: string,
  width = COMMONS_THUMB_WIDTH,
): Promise<string> {
  if (!isCommonsFilePathUrl(url)) return url;

  const cached = resolveCache.get(url);
  if (cached) return cached;

  const fileName = parseCommonsFilePathUrl(url);
  if (fileName) {
    const apiResults = await resolveBatchViaCommonsApi([fileName], width);
    const resolved = apiResults.get(normalizeFileName(fileName));
    if (resolved) {
      resolveCache.set(url, resolved);
      return resolved;
    }
  }

  const redirected = await resolveViaRedirect(url, width);
  if (redirected) {
    resolveCache.set(url, redirected);
    return redirected;
  }

  return url;
}

export type ResolveCommonsUrlsResult = {
  resolved: number;
  failed: number;
  skipped: number;
};

export async function resolveCommonsFilePathUrls(
  urls: string[],
  width = COMMONS_THUMB_WIDTH,
): Promise<Map<string, string>> {
  const unique = [...new Set(urls.filter(isCommonsFilePathUrl))];
  const mappings = new Map<string, string>();

  const urlToFileName = new Map<string, string>();
  const fileNames: string[] = [];

  for (const url of unique) {
    const cached = resolveCache.get(url);
    if (cached) {
      mappings.set(url, cached);
      continue;
    }

    const fileName = parseCommonsFilePathUrl(url);
    if (!fileName) continue;

    urlToFileName.set(url, fileName);
    fileNames.push(fileName);
  }

  const uniqueFileNames = [...new Set(fileNames)];

  for (
    let offset = 0;
    offset < uniqueFileNames.length;
    offset += API_BATCH_SIZE
  ) {
    const batch = uniqueFileNames.slice(offset, offset + API_BATCH_SIZE);
    const apiResults = await resolveBatchViaCommonsApi(batch, width);

    for (const [url, fileName] of urlToFileName) {
      if (mappings.has(url)) continue;

      const resolved = apiResults.get(normalizeFileName(fileName));
      if (resolved) {
        mappings.set(url, resolved);
        resolveCache.set(url, resolved);
      }
    }

    if (offset + API_BATCH_SIZE < uniqueFileNames.length) {
      await sleep(API_BATCH_DELAY_MS);
    }
  }

  const unresolved = unique.filter((url) => !mappings.has(url));
  for (const url of unresolved) {
    const fileName = parseCommonsFilePathUrl(url);
    let resolved: string | null = null;

    if (fileName) {
      for (let attempt = 0; attempt < MAX_RETRIES && !resolved; attempt += 1) {
        if (attempt > 0) await sleep(REDIRECT_DELAY_MS * attempt);
        const apiResults = await resolveBatchViaCommonsApi([fileName], width);
        resolved = apiResults.get(normalizeFileName(fileName)) ?? null;
      }
    }

    if (!resolved) {
      for (let attempt = 0; attempt < MAX_RETRIES && !resolved; attempt += 1) {
        if (attempt > 0) await sleep(REDIRECT_DELAY_MS * attempt);
        resolved = await resolveViaRedirect(url, width);
      }
    }

    if (resolved) {
      mappings.set(url, resolved);
      resolveCache.set(url, resolved);
    } else {
      mappings.set(url, url);
    }

    await sleep(REDIRECT_DELAY_MS);
  }

  for (const url of unique) {
    if (!mappings.has(url)) {
      mappings.set(url, url);
    }
  }

  return mappings;
}

export async function resolveCommonsFilePathUrlsInList(
  urls: string[],
  width = COMMONS_THUMB_WIDTH,
): Promise<{ urls: string[]; stats: ResolveCommonsUrlsResult }> {
  const pending = urls.filter(isCommonsFilePathUrl);
  if (pending.length === 0) {
    return {
      urls,
      stats: { resolved: 0, failed: 0, skipped: urls.length },
    };
  }

  const mappings = await resolveCommonsFilePathUrls(pending, width);

  let resolved = 0;
  let failed = 0;

  const nextUrls = urls.map((url) => {
    if (!isCommonsFilePathUrl(url)) return url;

    const mapped = mappings.get(url) ?? url;
    if (mapped !== url && mapped.includes("upload.wikimedia.org")) {
      resolved += 1;
      return mapped;
    }

    failed += 1;
    return url;
  });

  return {
    urls: nextUrls,
    stats: {
      resolved,
      failed,
      skipped: urls.length - pending.length,
    },
  };
}
