import earcut from "earcut";
import type { LatLng } from "react-native-maps";

const DEG2RAD = Math.PI / 180;
const COORD_EPSILON = 1e-6;

export function canonicalLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

export function canonicalLatLng(point: LatLng): LatLng {
  return {
    latitude: point.latitude,
    longitude: canonicalLongitude(point.longitude),
  };
}

function coordsNear(a: number, b: number): boolean {
  return Math.abs(a - b) < COORD_EPSILON;
}

/** Unwrap consecutive longitudes so adjacent edges never jump more than 180°. */
export function unwrapRingLongitudes(ring: LatLng[]): LatLng[] {
  if (ring.length === 0) return ring;

  const result: LatLng[] = [{ ...ring[0]! }];
  for (let i = 1; i < ring.length; i += 1) {
    const prev = result[result.length - 1]!;
    let lng = ring[i]!.longitude;
    while (lng - prev.longitude > 180) lng -= 360;
    while (lng - prev.longitude < -180) lng += 360;
    result.push({ latitude: ring[i]!.latitude, longitude: lng });
  }

  return result;
}

/** Spherical centroid for projection anchor. */
export function ringSphericalCentroid(ring: LatLng[]): {
  lat: number;
  lng: number;
} {
  let x = 0;
  let y = 0;
  let z = 0;

  for (const point of ring) {
    const phi = (90 - point.latitude) * DEG2RAD;
    const theta = (point.longitude + 180) * DEG2RAD;
    x += -Math.sin(phi) * Math.cos(theta);
    y += Math.cos(phi);
    z += Math.sin(phi) * Math.sin(theta);
  }

  const len = Math.hypot(x, y, z);
  if (len < 1e-8) {
    return { lat: ring[0]?.latitude ?? 0, lng: ring[0]?.longitude ?? 0 };
  }

  x /= len;
  y /= len;
  z /= len;

  const lat = (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
  const lng = (((Math.atan2(z, -x) * 180) / Math.PI + 540) % 360) - 180;
  return { lat, lng };
}

/** Stereographic projection — stable for large country polygons on the sphere. */
export function projectToStereographicFlat(
  ring: LatLng[],
  center: { lat: number; lng: number },
): number[] {
  const phi1 = center.lat * DEG2RAD;
  const lam0 = center.lng * DEG2RAD;
  const cosPhi1 = Math.cos(phi1);
  const sinPhi1 = Math.sin(phi1);
  const flat: number[] = [];

  for (const point of ring) {
    const phi = point.latitude * DEG2RAD;
    const lam = point.longitude * DEG2RAD;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosLamDiff = Math.cos(lam - lam0);
    const sinLamDiff = Math.sin(lam - lam0);
    const denom = 1 + sinPhi1 * sinPhi + cosPhi1 * cosPhi * cosLamDiff;

    if (denom < 1e-6) {
      flat.push(
        (point.longitude - center.lng) * cosPhi1,
        point.latitude - center.lat,
      );
      continue;
    }

    const k = 2 / denom;
    flat.push(
      k * cosPhi * sinLamDiff,
      k * (cosPhi1 * sinPhi - sinPhi1 * cosPhi * cosLamDiff),
    );
  }

  return flat;
}

/** Triangulate a simple polygon ring (flat [x,y,...]). */
export function triangulatePolygonFlat(flat: number[]): number[] {
  if (flat.length < 6) return [];
  return earcut(flat);
}

/** Triangulate polygon with holes using earcut hole indices. */
export function triangulatePolygonWithHolesFlat(
  flat: number[],
  holeIndices: number[],
): number[] {
  if (flat.length < 6) return [];
  return earcut(flat, holeIndices);
}

/** Build flat coords + hole indices for outer ring and holes (same projection). */
export function polygonRingsToFlat(
  outer: LatLng[],
  holes: LatLng[][],
): { flat: number[]; holeIndices: number[]; points: LatLng[] } {
  const unwrappedOuter = unwrapRingLongitudes(outer);
  const center = ringSphericalCentroid(unwrappedOuter);
  const points: LatLng[] = [...unwrappedOuter];
  const flat = projectToStereographicFlat(unwrappedOuter, center);
  const holeIndices: number[] = [];

  for (const hole of holes) {
    holeIndices.push(points.length);
    const unwrappedHole = unwrapRingLongitudes(hole);
    points.push(...unwrappedHole);
    flat.push(...projectToStereographicFlat(unwrappedHole, center));
  }

  return { flat, holeIndices, points };
}

/** Project a single ring for simple fills (no holes). */
export function ringToProjectionFlat(ring: LatLng[]): {
  flat: number[];
  points: LatLng[];
} {
  const points = unwrapRingLongitudes(ring);
  const center = ringSphericalCentroid(points);
  return {
    points,
    flat: projectToStereographicFlat(points, center),
  };
}

/** @deprecated Use triangulatePolygonFlat (earcut). */
export function triangulateEarClip(flat: number[]): number[] {
  return triangulatePolygonFlat(flat);
}

/** @deprecated Use ringToProjectionFlat. */
export function ringToTangentPlaneFlat(ring: LatLng[]): number[] {
  return ringToProjectionFlat(ring).flat;
}

/**
 * Split rings that cross the antimeridian into hemispheric chains with seam vertices.
 * Falls back to the original ring when no seam is inserted.
 */
export function splitRingAtAntimeridian(ring: LatLng[]): LatLng[][] {
  if (ring.length < 3) return [];

  type SeamSplit = { exit: LatLng; enter: LatLng };
  const expanded: LatLng[] = [];
  const seamSplits: SeamSplit[] = [];

  for (let i = 0; i < ring.length; i += 1) {
    const curr = ring[i]!;
    const next = ring[(i + 1) % ring.length]!;
    expanded.push(curr);

    let dLng = next.longitude - curr.longitude;
    if (Math.abs(dLng) <= 180) continue;
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;

    const goingEast = dLng > 0;
    const seamExitLng = goingEast ? 180 : -180;
    const seamEnterLng = -seamExitLng;
    const t = (seamExitLng - curr.longitude) / dLng;
    const lat = curr.latitude + t * (next.latitude - curr.latitude);
    const exit = { latitude: lat, longitude: seamExitLng };
    const enter = { latitude: lat, longitude: seamEnterLng };
    expanded.push(exit, enter);
    seamSplits.push({ exit, enter });
  }

  if (seamSplits.length === 0) return [ring];

  const chains: LatLng[][] = [];
  let current: LatLng[] = [];

  for (const point of expanded) {
    const prev = current[current.length - 1];
    const isSeamEnter =
      prev &&
      seamSplits.some(
        (seam) =>
          coordsNear(seam.enter.latitude, point.latitude) &&
          coordsNear(seam.enter.longitude, point.longitude) &&
          coordsNear(seam.exit.latitude, prev.latitude) &&
          coordsNear(seam.exit.longitude, prev.longitude),
      );

    if (isSeamEnter) {
      if (current.length >= 3) chains.push(current);
      current = [point];
      continue;
    }

    current.push(point);
  }

  if (current.length >= 3) chains.push(current);
  return chains.length > 0 ? chains : [ring];
}
