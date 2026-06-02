import earcut from "earcut";
import type { LatLng } from "react-native-maps";

import { vector3ToLatLng } from "@/lib/latlng-to-sphere";
import {
  latLngRingToUnitVectors,
  projectUnitVectorsToTangentPlane,
  sphericalCentroidUnit,
} from "@/lib/sphere-math";

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

  const [lat, lng] = vector3ToLatLng(x, y, z);
  return { lat, lng };
}

/**
 * Project a ring to 2D using the tangent plane at the spherical centroid.
 * Vertices are converted to unit sphere first — no stereographic lat/lng flattening.
 */
export function projectRingToTangentPlaneFlat(ring: LatLng[]): number[] {
  const vectors = latLngRingToUnitVectors(ring);
  const normal = sphericalCentroidUnit(vectors);
  return projectUnitVectorsToTangentPlane(vectors, normal);
}

/** @deprecated Stereographic — prefer `projectRingToTangentPlaneFlat`. */
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
    const k = 2 / Math.max(denom, 1e-12);
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

/** Build flat coords + hole indices for outer ring and holes (shared tangent-plane pole). */
export function polygonRingsToFlat(
  outer: LatLng[],
  holes: LatLng[][],
): { flat: number[]; holeIndices: number[]; points: LatLng[] } {
  const unwrappedOuter = unwrapRingLongitudes(outer);
  const points: LatLng[] = [...unwrappedOuter];
  const allVectors = latLngRingToUnitVectors(points);
  const normal = sphericalCentroidUnit(allVectors);
  const flat = projectUnitVectorsToTangentPlane(allVectors, normal);
  const holeIndices: number[] = [];

  for (const hole of holes) {
    holeIndices.push(points.length);
    const unwrappedHole = unwrapRingLongitudes(hole);
    points.push(...unwrappedHole);
    const holeVectors = latLngRingToUnitVectors(unwrappedHole);
    flat.push(...projectUnitVectorsToTangentPlane(holeVectors, normal));
  }

  return { flat, holeIndices, points };
}

/** Project a single ring for simple fills (no holes). */
export function ringToProjectionFlat(ring: LatLng[]): {
  flat: number[];
  points: LatLng[];
} {
  const points = unwrapRingLongitudes(ring);
  return {
    points,
    flat: projectRingToTangentPlaneFlat(points),
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

  const chainHemisphere = (chain: LatLng[]): "east" | "west" => {
    for (const point of chain) {
      if (!coordsNear(Math.abs(point.longitude), 180)) {
        return point.longitude >= 0 ? "east" : "west";
      }
    }
    return chain[0]!.longitude >= 0 ? "east" : "west";
  };

  const chains: LatLng[][] = [];
  let current: LatLng[] = [];
  let leadSegment: LatLng[] | null = null;

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
      if (chains.length === 0 && leadSegment === null && current.length > 0) {
        leadSegment = current;
      } else if (current.length >= 3) {
        chains.push(current);
      }
      current = [point];
      continue;
    }

    current.push(point);
  }

  if (leadSegment && leadSegment.length > 0) {
    if (chains.length > 0) {
      const firstHemisphere = chainHemisphere(chains[0]!);
      const lastHemisphere = chainHemisphere(chains[chains.length - 1]!);
      const leadHemisphere = chainHemisphere(leadSegment);

      if (
        firstHemisphere === lastHemisphere &&
        firstHemisphere === leadHemisphere
      ) {
        chains[chains.length - 1]!.push(...leadSegment);
      } else if (
        current.length > 0 &&
        leadHemisphere === chainHemisphere(current)
      ) {
        const merged = [...leadSegment, ...current];
        if (merged.length >= 3) chains.push(merged);
        current = [];
      }
    } else if (
      current.length > 0 &&
      chainHemisphere(leadSegment) === chainHemisphere(current)
    ) {
      current = [...leadSegment, ...current];
    }
  }

  if (current.length >= 3) chains.push(current);
  return chains.length > 0 ? chains : [ring];
}
