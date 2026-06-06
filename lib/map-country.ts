import { cca3FromCca2 } from "@/lib/cca2-to-cca3";
import type { Country, MapCountry } from "@/types/country";

/** Extract ISO alpha-2 from a flagcdn URL when present. */
export function cca2FromFlagUrl(flag: string): string {
  const match = flag.match(/flagcdn\.com\/w\d+\/([a-z]{2})\.png/i);
  return match?.[1]?.toUpperCase() ?? "";
}

/** Resolve ISO alpha-3 from a flagcdn URL (via alpha-2 lookup). */
export function cca3FromFlagUrl(flag: string): string {
  return cca3FromCca2(cca2FromFlagUrl(flag));
}

/** Minimal `Country` for save / Explore when full detail is not loaded yet. */
export function mapCountryToCountry(
  map: MapCountry,
  detail?: Country | null,
): Country {
  // Merge detail + map so we never lose required fields like `population`.
  // Some backend payloads can be partial during async loading.
  const merged = detail ? { ...detail } : null;
  const fallbackPopulation = map.population;
  const safePopulation =
    merged && Number.isFinite(merged.population)
      ? merged.population
      : fallbackPopulation;

  return {
    name: merged?.name ?? map.name,
    capital: merged?.capital ?? map.capital,
    region: merged?.region ?? map.region,
    population: safePopulation,
    cca2: merged?.cca2 ?? cca2FromFlagUrl(map.flag),
    flag: merged?.flag ?? map.flag,
    latlng: merged?.latlng ?? map.latlng,
    languages: merged?.languages,
    images: merged?.images ?? (map.image ? [map.image] : undefined),
    ai: merged?.ai,
  };
}

export function isValidLatLng(
  latlng: [number, number] | undefined | null,
): latlng is [number, number] {
  if (!latlng || latlng.length < 2) return false;
  const [lat, lng] = latlng;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** react-native-maps only renders markers between ±85° latitude. */
const MAP_MARKER_MAX_LATITUDE = 85;

/**
 * Pin + camera position for Antarctica. REST Countries reports the south pole
 * ([-90, 0]), which is off the visible map and hides the flag marker.
 */
export const ANTARCTICA_DISPLAY_LATLNG: [number, number] = [-72, 20];

const DISPLAY_LATLNG_BY_NAME: Record<string, [number, number]> = {
  Antarctica: ANTARCTICA_DISPLAY_LATLNG,
};

/** WGS84 coordinate used for map pins and camera focus (may differ from API latlng). */
export function getMapDisplayLatLng(
  country: Pick<MapCountry | Country, "name" | "latlng">,
): [number, number] {
  const override = DISPLAY_LATLNG_BY_NAME[country.name];
  if (override) return override;

  // Never hand back an invalid coordinate: passing NaN/undefined to the native
  // MapView's animateToRegion crashes the app. Fall back to [0, 0] instead.
  if (!isValidLatLng(country.latlng)) return [0, 0];

  const [lat, lng] = country.latlng;
  if (lat < -MAP_MARKER_MAX_LATITUDE) return [-MAP_MARKER_MAX_LATITUDE, lng];
  if (lat > MAP_MARKER_MAX_LATITUDE) return [MAP_MARKER_MAX_LATITUDE, lng];
  return [lat, lng];
}

/** Standard equirectangular world map (360° wide × 180° tall). */
export const EQUIRECTANGULAR_MAP_ASPECT_RATIO = 2;

const EQUIRECTANGULAR_EDGE_EPSILON = 0.001;

function equirectangularNormalizedPoint(
  lat: number,
  lng: number,
): { u: number; v: number } {
  const u = (lng + 180) / 360;
  const v = (90 - lat) / 180;

  return {
    u: Math.min(
      1 - EQUIRECTANGULAR_EDGE_EPSILON,
      Math.max(EQUIRECTANGULAR_EDGE_EPSILON, u),
    ),
    v: Math.min(
      1 - EQUIRECTANGULAR_EDGE_EPSILON,
      Math.max(EQUIRECTANGULAR_EDGE_EPSILON, v),
    ),
  };
}

const COVER_CENTERING_MAX_ZOOM = 12;

function coverCenteredLayoutFillsViewport(
  lat: number,
  lng: number,
  containerWidth: number,
  containerHeight: number,
  zoom: number,
  imageAspectRatio = EQUIRECTANGULAR_MAP_ASPECT_RATIO,
): boolean {
  const imageWidth = containerWidth * zoom;
  const imageHeight = containerHeight * zoom;
  const { left, top } = latLngToEquirectangularCoverPosition(
    lat,
    lng,
    imageWidth,
    imageHeight,
    imageAspectRatio,
  );
  const imageLeft = containerWidth / 2 - left;
  const imageTop = containerHeight / 2 - top;

  return (
    imageLeft <= 0 &&
    imageTop <= 0 &&
    imageLeft + imageWidth >= containerWidth &&
    imageTop + imageHeight >= containerHeight
  );
}

/** Minimum cover zoom so a WGS84 point can sit at the container center without gaps. */
export function equirectangularCoverCenteringZoom(
  lat: number,
  lng: number,
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio = EQUIRECTANGULAR_MAP_ASPECT_RATIO,
  paddingFactor = 1.04,
): number {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return 1;
  }

  if (
    coverCenteredLayoutFillsViewport(
      lat,
      lng,
      containerWidth,
      containerHeight,
      1,
      imageAspectRatio,
    )
  ) {
    return paddingFactor;
  }

  let low = 1;
  let high = COVER_CENTERING_MAX_ZOOM;

  while (high - low > 0.01) {
    const mid = (low + high) / 2;
    if (
      coverCenteredLayoutFillsViewport(
        lat,
        lng,
        containerWidth,
        containerHeight,
        mid,
        imageAspectRatio,
      )
    ) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high * paddingFactor;
}

export type EquirectangularCoverCenteredLayout = {
  zoom: number;
  imageWidth: number;
  imageHeight: number;
  imageLeft: number;
  imageTop: number;
};

/**
 * Layout a zoomed `cover`-fit equirectangular map so a WGS84 point sits at the
 * container center while every edge of the viewport stays filled.
 */
export function latLngToEquirectangularCoverCenteredLayout(
  lat: number,
  lng: number,
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio = EQUIRECTANGULAR_MAP_ASPECT_RATIO,
  paddingFactor = 1.04,
): EquirectangularCoverCenteredLayout {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return {
      zoom: 1,
      imageWidth: 0,
      imageHeight: 0,
      imageLeft: 0,
      imageTop: 0,
    };
  }

  const zoom = equirectangularCoverCenteringZoom(
    lat,
    lng,
    containerWidth,
    containerHeight,
    imageAspectRatio,
    paddingFactor,
  );
  const imageWidth = containerWidth * zoom;
  const imageHeight = containerHeight * zoom;
  const { left, top } = latLngToEquirectangularCoverPosition(
    lat,
    lng,
    imageWidth,
    imageHeight,
    imageAspectRatio,
  );

  return {
    zoom,
    imageWidth,
    imageHeight,
    imageLeft: containerWidth / 2 - left,
    imageTop: containerHeight / 2 - top,
  };
}

function equirectangularScaledBounds(
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio: number,
  fit: "cover" | "contain",
): {
  scaledWidth: number;
  scaledHeight: number;
  offsetX: number;
  offsetY: number;
} {
  const imageWidth = imageAspectRatio;
  const imageHeight = 1;
  const scale =
    fit === "cover"
      ? Math.max(containerWidth / imageWidth, containerHeight / imageHeight)
      : Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;

  return {
    scaledWidth,
    scaledHeight,
    offsetX: (containerWidth - scaledWidth) / 2,
    offsetY: (containerHeight - scaledHeight) / 2,
  };
}

/**
 * Map WGS84 coordinates to pixel position inside a container using `cover` fit
 * (same as expo-image `contentFit="cover"` on a 2:1 equirectangular texture).
 */
export function latLngToEquirectangularCoverPosition(
  lat: number,
  lng: number,
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio = EQUIRECTANGULAR_MAP_ASPECT_RATIO,
): { left: number; top: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { left: 0, top: 0 };
  }

  const { u, v } = equirectangularNormalizedPoint(lat, lng);
  const { scaledWidth, scaledHeight, offsetX, offsetY } =
    equirectangularScaledBounds(
      containerWidth,
      containerHeight,
      imageAspectRatio,
      "cover",
    );

  return {
    left: u * scaledWidth + offsetX,
    top: v * scaledHeight + offsetY,
  };
}

/**
 * Map WGS84 coordinates to pixel position inside a container using `contain`
 * fit (same as expo-image `contentFit="contain"` on a 2:1 equirectangular texture).
 */
export function latLngToEquirectangularContainPosition(
  lat: number,
  lng: number,
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio = EQUIRECTANGULAR_MAP_ASPECT_RATIO,
): { left: number; top: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { left: 0, top: 0 };
  }

  const { u, v } = equirectangularNormalizedPoint(lat, lng);
  const { scaledWidth, scaledHeight, offsetX, offsetY } =
    equirectangularScaledBounds(
      containerWidth,
      containerHeight,
      imageAspectRatio,
      "contain",
    );

  return {
    left: u * scaledWidth + offsetX,
    top: v * scaledHeight + offsetY,
  };
}

/** Build a map country from search/feed data when the map list has not loaded yet. */
export function countryToMapCountry(country: Country): MapCountry {
  return {
    name: country.name,
    capital: country.capital,
    region: country.region,
    population: country.population,
    flag: country.flag,
    latlng: country.latlng,
    image: country.images?.[0] ?? null,
  };
}
