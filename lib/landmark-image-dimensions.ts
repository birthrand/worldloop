import { Image as RNImage } from "react-native";

import { normalizeImageUrl } from "@/lib/normalize-image-url";

type ImageDimensions = {
  width: number;
  height: number;
};

const dimensionsCache = new Map<string, ImageDimensions>();

function normalizeLandmarkImageUri(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl) return null;
  return normalizeImageUrl(imageUrl);
}

export function getCachedLandmarkImageDimensions(
  imageUrl: string | null | undefined,
): ImageDimensions | null {
  const uri = normalizeLandmarkImageUri(imageUrl);
  if (!uri) return null;

  return dimensionsCache.get(uri) ?? null;
}

export function cacheLandmarkImageDimensions(
  imageUrl: string,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return;

  const uri = normalizeLandmarkImageUri(imageUrl);
  if (!uri) return;

  dimensionsCache.set(uri, { width, height });
}

export function prefetchLandmarkImageDimensions(
  imageUrl: string | null | undefined,
): void {
  const uri = normalizeLandmarkImageUri(imageUrl);
  if (!uri || dimensionsCache.has(uri)) return;

  RNImage.getSize(
    uri,
    (width, height) => {
      dimensionsCache.set(uri, { width, height });
    },
    () => {},
  );
}
