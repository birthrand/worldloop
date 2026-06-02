import {
  polygonRingsToFlat,
  ringSphericalCentroid,
  ringToProjectionFlat,
  splitRingAtAntimeridian,
  triangulatePolygonFlat,
  triangulatePolygonWithHolesFlat,
  unwrapRingLongitudes,
} from "@/lib/globe-polygon-triangulation";
import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";
import {
  latLngRingToUnitVectors,
  minVertexNormalAlignment,
  sphericalCentroidUnit,
} from "@/lib/sphere-math";
import type { LatLng } from "react-native-maps";

/** Dev-only checks for gaps/holes in country boundary fill meshes. */
export const GLOBE_BOUNDARY_FILL_DEBUG = __DEV__;

export type BoundaryFillChainDiagnostic = {
  chainIndex: number;
  vertices: number;
  matchedGeoHoles: number;
  triangleCount: number;
  minTriangleArea: number;
  flippedTriangleCount: number;
  minVertexAlignment: number;
  geometryBuilt: boolean;
  usedHoleTriangulation: boolean;
};

export type BoundaryFillPolygonDiagnostic = {
  polygonId: string;
  countryName: string;
  omitHoles: boolean;
  geoHoleCount: number;
  chainCount: number;
  geometryPartCount: number;
  lngSpan: number;
  crossesAntimeridian: boolean;
  unexpectedAntimeridianSplit: boolean;
  centroid: { lat: number; lng: number };
  bboxLngCenter: number;
  centroidLngDelta: number;
  chains: BoundaryFillChainDiagnostic[];
  issues: string[];
};

function dedupeClosingPoint(ring: LatLng[]): LatLng[] {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return ring.slice(0, -1);
  }
  return ring;
}

function ringLngSpan(ring: LatLng[]): number {
  const lngs = ring.map((point) => point.longitude);
  return Math.max(...lngs) - Math.min(...lngs);
}

/** True when any edge jumps more than 180° in longitude (needs antimeridian split). */
function ringCrossesAntimeridian(ring: LatLng[]): boolean {
  for (let i = 0; i < ring.length; i += 1) {
    const curr = ring[i]!;
    const next = ring[(i + 1) % ring.length]!;
    let dLng = next.longitude - curr.longitude;
    if (Math.abs(dLng) <= 180) continue;
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;
    if (Math.abs(dLng) > 180) return true;
  }
  return false;
}

function minRingVertexAlignment(ring: LatLng[]): number {
  const vectors = latLngRingToUnitVectors(ring);
  const normal = sphericalCentroidUnit(vectors);
  return minVertexNormalAlignment(vectors, normal);
}

function analyzeFlatTriangles(
  flat: number[],
  indices: number[],
): {
  triangleCount: number;
  minTriangleArea: number;
  flippedTriangleCount: number;
} {
  let minTriangleArea = Infinity;
  let flippedTriangleCount = 0;
  const triangleCount = Math.floor(indices.length / 3);

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 2;
    const b = indices[i + 1]! * 2;
    const c = indices[i + 2]! * 2;
    const x0 = flat[a]!;
    const y0 = flat[a + 1]!;
    const x1 = flat[b]!;
    const y1 = flat[b + 1]!;
    const x2 = flat[c]!;
    const y2 = flat[c + 1]!;
    const signedArea = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    const area = Math.abs(signedArea) * 0.5;
    if (area < minTriangleArea) minTriangleArea = area;
    if (signedArea < 0) flippedTriangleCount += 1;
  }

  if (!Number.isFinite(minTriangleArea)) minTriangleArea = 0;

  return { triangleCount, minTriangleArea, flippedTriangleCount };
}

function holesForChain(chain: LatLng[], holes: LatLng[][]): LatLng[][] {
  if (holes.length === 0) return [];

  const chainCentroid = ringSphericalCentroid(chain);
  const chainLats = chain.map((point) => point.latitude);
  const chainLngs = chain.map((point) => point.longitude);
  const minLat = Math.min(...chainLats);
  const maxLat = Math.max(...chainLats);
  const minLng = Math.min(...chainLngs);
  const maxLng = Math.max(...chainLngs);

  return holes.filter((hole) => {
    const holeCentroid = ringSphericalCentroid(hole);
    const latInRange =
      holeCentroid.lat >= minLat - 2 && holeCentroid.lat <= maxLat + 2;
    const lngInRange =
      holeCentroid.lng >= minLng - 2 && holeCentroid.lng <= maxLng + 2;

    if (latInRange && lngInRange) return true;

    const latDelta = Math.abs(holeCentroid.lat - chainCentroid.lat);
    const lngDelta = Math.abs(holeCentroid.lng - chainCentroid.lng);
    return latDelta < 25 && lngDelta < 40;
  });
}

/** Mirror `polygonToSphereGeometries` and collect triangulation red flags. */
export function diagnoseBoundaryFillPolygon(
  polygon: CountryBoundaryPolygon,
  omitHoles: boolean,
): BoundaryFillPolygonDiagnostic | null {
  const countryName = polygon.countryName?.trim();
  if (!countryName) return null;

  const outer = dedupeClosingPoint(polygon.coordinates);
  if (outer.length < 3) return null;

  const geoHoles = omitHoles
    ? []
    : (polygon.holes ?? [])
        .map(dedupeClosingPoint)
        .filter((hole) => hole.length >= 3);

  const chains = splitRingAtAntimeridian(outer);
  const crossesAntimeridian = ringCrossesAntimeridian(outer);
  const unexpectedAntimeridianSplit = chains.length > 1 && !crossesAntimeridian;

  const unwrappedOuter = unwrapRingLongitudes(outer);
  const centroid = ringSphericalCentroid(unwrappedOuter);
  const lngs = unwrappedOuter.map((point) => point.longitude);
  const bboxLngCenter = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centroidLngDelta = Math.abs(centroid.lng - bboxLngCenter);

  const chainDiagnostics: BoundaryFillChainDiagnostic[] = [];
  let geometryPartCount = 0;
  const issues: string[] = [];

  if (unexpectedAntimeridianSplit) {
    issues.push("unexpected-antimeridian-split");
  }
  if (centroidLngDelta > 35) {
    issues.push("centroid-far-from-bbox");
  }

  for (let chainIndex = 0; chainIndex < chains.length; chainIndex += 1) {
    const chain = chains[chainIndex]!;
    const chainHoles = holesForChain(chain, geoHoles);
    const unwrappedChain = unwrapRingLongitudes(chain);

    let flat: number[] = [];
    let indices: number[] = [];
    let usedHoleTriangulation = false;
    let minVertexAlignment = minRingVertexAlignment(unwrappedChain);

    if (chainHoles.length > 0) {
      usedHoleTriangulation = true;
      const projected = polygonRingsToFlat(chain, chainHoles);
      flat = projected.flat;
      minVertexAlignment = Math.min(
        minVertexAlignment,
        minRingVertexAlignment(projected.points),
      );
      indices =
        projected.holeIndices.length > 0
          ? triangulatePolygonWithHolesFlat(flat, projected.holeIndices)
          : triangulatePolygonFlat(flat);
    } else {
      const projected = ringToProjectionFlat(dedupeClosingPoint(chain));
      flat = projected.flat;
      indices = triangulatePolygonFlat(flat);
    }

    const { triangleCount, minTriangleArea, flippedTriangleCount } =
      analyzeFlatTriangles(flat, indices);

    const geometryBuilt = indices.length >= 3;
    if (geometryBuilt) geometryPartCount += 1;

    if (!geometryBuilt) issues.push(`chain-${chainIndex}-no-triangles`);
    if (flippedTriangleCount > 0) {
      issues.push(`chain-${chainIndex}-flipped-triangles`);
    }
    if (minTriangleArea > 0 && minTriangleArea < 1e-12) {
      issues.push(`chain-${chainIndex}-degenerate-triangles`);
    }
    if (minVertexAlignment < 0.15) {
      issues.push(`chain-${chainIndex}-low-tangent-alignment`);
    }

    chainDiagnostics.push({
      chainIndex,
      vertices: chain.length,
      matchedGeoHoles: chainHoles.length,
      triangleCount,
      minTriangleArea,
      flippedTriangleCount,
      minVertexAlignment,
      geometryBuilt,
      usedHoleTriangulation,
    });
  }

  if (geometryPartCount === 0) issues.push("no-fill-geometry");
  if (omitHoles && (polygon.holes?.length ?? 0) > 0) {
    issues.push("geo-holes-omitted-for-overlay");
  }
  if (
    !omitHoles &&
    geoHoles.length > 0 &&
    chainDiagnostics.every((chain) => chain.matchedGeoHoles === 0)
  ) {
    issues.push("geo-holes-unmatched");
  }

  return {
    polygonId: polygon.id,
    countryName,
    omitHoles,
    geoHoleCount: geoHoles.length,
    chainCount: chains.length,
    geometryPartCount,
    lngSpan: ringLngSpan(outer),
    crossesAntimeridian,
    unexpectedAntimeridianSplit,
    centroid: {
      lat: +centroid.lat.toFixed(2),
      lng: +centroid.lng.toFixed(2),
    },
    bboxLngCenter: +bboxLngCenter.toFixed(2),
    centroidLngDelta: +centroidLngDelta.toFixed(2),
    chains: chainDiagnostics,
    issues: [...new Set(issues)],
  };
}

export function logBoundaryFillHoleDiagnostics(
  diagnostics: BoundaryFillPolygonDiagnostic[],
): void {
  if (!GLOBE_BOUNDARY_FILL_DEBUG || diagnostics.length === 0) return;

  for (const diagnostic of diagnostics) {
    const payload = {
      polygonId: diagnostic.polygonId,
      omitHoles: diagnostic.omitHoles,
      geoHoleCount: diagnostic.geoHoleCount,
      chainCount: diagnostic.chainCount,
      geometryPartCount: diagnostic.geometryPartCount,
      lngSpan: diagnostic.lngSpan,
      crossesAntimeridian: diagnostic.crossesAntimeridian,
      unexpectedAntimeridianSplit: diagnostic.unexpectedAntimeridianSplit,
      centroid: diagnostic.centroid,
      bboxLngCenter: diagnostic.bboxLngCenter,
      centroidLngDelta: diagnostic.centroidLngDelta,
      chains: diagnostic.chains,
      issues: diagnostic.issues,
    };

    if (diagnostic.issues.length > 0) {
      console.warn(
        `[boundary-fill] ${diagnostic.countryName} — possible fill holes`,
        payload,
      );
      continue;
    }

    console.log(
      `[boundary-fill] ${diagnostic.countryName} — fill overlay ok`,
      payload,
    );
  }
}
