import {
  getCachedCountryProfile,
  hydrateCountryProfileFromDisk,
  seedStaticCountryProfileIfAvailable,
} from "@/lib/country-profile-cache";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import {
  getStaticCountryProfileByName,
  isStaticCountryProfileCatalogEnabled,
} from "@/lib/static-country-profiles";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

function shuffleItems<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function hasUsableLandmarkName(name: string | undefined): boolean {
  return Boolean(name?.trim());
}

async function resolveLandmarksForCountry(
  country: Country,
): Promise<PlaceFeedItem[]> {
  const name = country.name.trim();
  if (!name) return [];

  if (isStaticCountryProfileCatalogEnabled()) {
    const staticProfile = getStaticCountryProfileByName(name);
    if ((staticProfile?.landmarks.length ?? 0) > 0) {
      return staticProfile!.landmarks
        .filter((landmark) => hasUsableLandmarkName(landmark.name))
        .map((landmark) => ({ landmark, country }));
    }
  }

  await hydrateCountryProfileFromDisk(name);
  seedStaticCountryProfileIfAvailable(name, country);

  let cached = getCachedCountryProfile(name);
  if ((cached?.landmarks.length ?? 0) === 0) {
    await prefetchCountryProfile(name);
    cached = getCachedCountryProfile(name);
  }

  return (cached?.landmarks ?? [])
    .filter((landmark) => hasUsableLandmarkName(landmark.name))
    .map((landmark) => ({ landmark, country }));
}

/** Flatten landmarks from a country pool into a swipeable Places queue. */
export async function flattenLandmarksForFeed(
  countries: Country[],
): Promise<PlaceFeedItem[]> {
  if (countries.length === 0) return [];

  const batches = await Promise.all(
    countries.map((country) =>
      resolveLandmarksForCountry(country).catch(() => [] as PlaceFeedItem[]),
    ),
  );

  const withImage: PlaceFeedItem[] = [];
  const withoutImage: PlaceFeedItem[] = [];

  for (const item of batches.flat()) {
    if (item.landmark.imageUrl) {
      withImage.push(item);
    } else {
      withoutImage.push(item);
    }
  }

  return [...shuffleItems(withImage), ...shuffleItems(withoutImage)];
}
