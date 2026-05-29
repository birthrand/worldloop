import type { Continent } from "@/constants/regions";
import type { MapCountry } from "@/types/country";
import type { LatLng } from "react-native-maps";

type GeoJsonGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "MultiPolygon";
      coordinates: number[][][][];
    };

type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties?: {
    CONTINENT?: string;
    ADMIN?: string;
    NAME?: string;
  };
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type CountryBoundaryPolygon = {
  id: string;
  /** Natural Earth `ADMIN` label (used to match REST Countries `name`). */
  countryName: string | null;
  continent: string | null;
  coordinates: LatLng[];
  holes?: LatLng[][];
};

export type BoundaryMapContext = {
  selectedCountryName: string | null;
  focusedRegion: string | null;
  countries: MapCountry[];
  /** When true at world zoom (no country/continent focus), render all country outlines. */
  showWorldBoundaries?: boolean;
};

/** REST Countries name → alternate Natural Earth `ADMIN` labels. */
const GEO_ADMIN_ALIASES_BY_API_NAME: Record<string, readonly string[]> = {
  "United States": ["United States of America"],
  Czechia: ["Czechia", "Czech Republic"],
  "Cape Verde": ["Cabo Verde"],
  "Ivory Coast": ["Côte d'Ivoire", "Cote d'Ivoire"],
  Eswatini: ["eSwatini", "Swaziland"],
  Myanmar: ["Myanmar", "Burma"],
  "North Korea": ["Dem. Rep. Korea", "North Korea"],
  "South Korea": ["Republic of Korea", "South Korea"],
  "North Macedonia": ["Macedonia", "North Macedonia"],
  "Republic of the Congo": ["Republic of the Congo"],
  "Democratic Republic of the Congo": [
    "Dem. Rep. Congo",
    "Democratic Republic of the Congo",
  ],
  "South Georgia": ["South Georgia and the Islands"],
};

const NATURAL_EARTH_CONTINENTS_BY_APP_REGION: Record<
  Continent,
  readonly string[]
> = {
  Africa: ["Africa"],
  "North America": ["North America"],
  "South America": ["South America"],
  Antarctic: ["Antarctica"],
  Asia: ["Asia"],
  Europe: ["Europe"],
  Oceania: ["Oceania"],
};

function normalizeCountryLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toLatLng([longitude, latitude]: number[]): LatLng {
  return { latitude, longitude };
}

function toRingPoints(ring: number[][]): LatLng[] {
  return ring.filter((point) => point.length >= 2).map(toLatLng);
}

/**
 * GeoJSON often repeats the south pole at both -180° and 180°, which makes
 * react-native-maps draw a map-spanning edge. Drop the duplicate seam point.
 */
function removeAntimeridianPoleSeam(points: LatLng[]): LatLng[] {
  if (points.length < 4) return points;

  const result: LatLng[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    const after = points[i + 1];

    if (
      prev &&
      after &&
      Math.abs(prev.longitude - next.longitude) > 180 &&
      Math.abs(prev.latitude) > 85 &&
      Math.abs(next.latitude) > 85 &&
      Math.abs(after.longitude - next.longitude) < 90
    ) {
      continue;
    }

    result.push(next);
  }

  return result.length >= 3 ? result : points;
}

function parsePolygonRings(
  polygonCoordinates: number[][][],
  featureId: string,
  countryName: string | null,
  continent: string | null,
): CountryBoundaryPolygon[] {
  if (polygonCoordinates.length === 0) return [];

  const rawOuter = toRingPoints(polygonCoordinates[0] ?? []);
  const outer =
    countryName === "Antarctica"
      ? removeAntimeridianPoleSeam(rawOuter)
      : rawOuter;
  if (outer.length < 3) return [];

  const holeRings = polygonCoordinates
    .slice(1)
    .map(toRingPoints)
    .filter((ring) => ring.length >= 3);

  return [
    {
      id: featureId,
      countryName,
      continent,
      coordinates: outer,
      holes: holeRings.length > 0 ? holeRings : undefined,
    },
  ];
}

export function parseCountryBoundaryPolygons(
  geoJson: GeoJsonFeatureCollection,
): CountryBoundaryPolygon[] {
  if (!geoJson || geoJson.type !== "FeatureCollection") return [];

  const polygons: CountryBoundaryPolygon[] = [];

  geoJson.features.forEach((feature, featureIndex) => {
    const geometry = feature.geometry;
    if (!geometry) return;

    const props = feature.properties;
    const countryName = props?.ADMIN ?? props?.NAME ?? null;
    const continent = props?.CONTINENT ?? null;
    const baseId = `country-boundary-${featureIndex}`;

    if (geometry.type === "Polygon") {
      polygons.push(
        ...parsePolygonRings(
          geometry.coordinates,
          `${baseId}-0`,
          countryName,
          continent,
        ),
      );
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygonCoordinates, polygonIndex) => {
        polygons.push(
          ...parsePolygonRings(
            polygonCoordinates,
            `${baseId}-${polygonIndex}`,
            countryName,
            continent,
          ),
        );
      });
    }
  });

  return polygons;
}

export function countryNamesMatch(
  apiCountryName: string,
  geoAdminName: string | null,
): boolean {
  if (!geoAdminName) return false;

  const normalizedGeo = normalizeCountryLabel(geoAdminName);
  const candidates = [
    apiCountryName,
    ...(GEO_ADMIN_ALIASES_BY_API_NAME[apiCountryName] ?? []),
  ];

  return candidates.some(
    (candidate) => normalizeCountryLabel(candidate) === normalizedGeo,
  );
}

function naturalEarthContinentMatchesRegion(
  continent: string | null,
  region: string,
): boolean {
  if (!continent) return false;

  const allowed =
    NATURAL_EARTH_CONTINENTS_BY_APP_REGION[region as Continent] ?? [];
  return allowed.includes(continent);
}

/**
 * Scope boundaries to map context (option 1 — implicit, no extra UI):
 * - Selected country → that country only (even when a continent is focused)
 * - Focused continent (no country selected) → countries in that region
 * - No focus → hidden unless `showWorldBoundaries` (grid toggle on world view)
 */
export function filterBoundaryPolygonsByMapContext(
  polygons: CountryBoundaryPolygon[],
  context: BoundaryMapContext,
): CountryBoundaryPolygon[] {
  const { selectedCountryName, focusedRegion, countries, showWorldBoundaries } =
    context;

  if (!selectedCountryName && !focusedRegion) {
    return showWorldBoundaries ? polygons : [];
  }

  if (selectedCountryName) {
    return polygons.filter((polygon) =>
      countryNamesMatch(selectedCountryName, polygon.countryName),
    );
  }

  if (focusedRegion) {
    const apiCountryNames = countries
      .filter((country) => country.region === focusedRegion)
      .map((country) => country.name);

    return polygons.filter((polygon) => {
      if (
        polygon.countryName &&
        apiCountryNames.some((name) =>
          countryNamesMatch(name, polygon.countryName),
        )
      ) {
        return true;
      }

      return naturalEarthContinentMatchesRegion(
        polygon.continent,
        focusedRegion,
      );
    });
  }

  return [];
}
