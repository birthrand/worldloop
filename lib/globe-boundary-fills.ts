import * as THREE from "three";

import {
  canonicalLatLng,
  polygonRingsToFlat,
  ringSphericalCentroid,
  ringToProjectionFlat,
  splitRingAtAntimeridian,
  triangulatePolygonFlat,
  triangulatePolygonWithHolesFlat,
} from "@/lib/globe-polygon-triangulation";
import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";
import type { LatLng } from "react-native-maps";

export const GLOBE_FILL_RADIUS = 1.003;
/** Slightly above the globe surface tap shell so boundary hits win raycasts. */
export const GLOBE_BOUNDARY_HIT_RADIUS = 1.012;

function dedupeClosingPoint(ring: LatLng[]): LatLng[] {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return ring.slice(0, -1);
  }
  return ring;
}

function pointsToSphereGeometry(
  points: LatLng[],
  indices: number[],
  radius: number,
): THREE.BufferGeometry | null {
  if (points.length < 3 || indices.length < 3) return null;

  const positions = new Float32Array(points.length * 3);
  points.forEach((point, index) => {
    const [x, y, z] = latLngToVector3(point.latitude, point.longitude, radius);
    const offset = index * 3;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function ringToSphereGeometry(
  ring: LatLng[],
  radius: number,
): THREE.BufferGeometry | null {
  const points = dedupeClosingPoint(ring);
  if (points.length < 3) return null;

  const { flat, points: planePoints } = ringToProjectionFlat(points);
  if (flat.length < 6) return null;

  const indices = triangulatePolygonFlat(flat);
  if (indices.length < 3) return null;

  const spherePoints = planePoints.map(canonicalLatLng);
  return pointsToSphereGeometry(spherePoints, indices, radius);
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

export type GlobeBoundaryFillOptions = {
  /** Solid fill — skip lake/bay holes (used when continent overlay sits below). */
  omitHoles?: boolean;
};

function polygonToSphereGeometries(
  polygon: CountryBoundaryPolygon,
  radius: number,
  omitHoles = false,
): THREE.BufferGeometry[] {
  const outer = dedupeClosingPoint(polygon.coordinates);
  if (outer.length < 3) return [];

  const holes = omitHoles
    ? []
    : (polygon.holes ?? [])
        .map(dedupeClosingPoint)
        .filter((hole) => hole.length >= 3);

  const chains = splitRingAtAntimeridian(outer);
  const geometries: THREE.BufferGeometry[] = [];

  for (const chain of chains) {
    const chainHoles = holesForChain(chain, holes);

    if (chainHoles.length > 0) {
      const { flat, holeIndices, points } = polygonRingsToFlat(
        chain,
        chainHoles,
      );
      const indices =
        holeIndices.length > 0
          ? triangulatePolygonWithHolesFlat(flat, holeIndices)
          : triangulatePolygonFlat(flat);
      const geometry = pointsToSphereGeometry(
        points.map(canonicalLatLng),
        indices,
        radius,
      );
      if (geometry) geometries.push(geometry);
      continue;
    }

    const geometry = ringToSphereGeometry(chain, radius);
    if (geometry) geometries.push(geometry);
  }

  return geometries;
}

export type GlobeBoundaryFill = {
  id: string;
  geometry: THREE.BufferGeometry;
};

export type GlobeBoundaryHitTarget = {
  id: string;
  countryName: string | null;
  geometry: THREE.BufferGeometry;
};

export function buildGlobeBoundaryFills(
  polygons: CountryBoundaryPolygon[],
  radius = GLOBE_FILL_RADIUS,
  options: GlobeBoundaryFillOptions = {},
): GlobeBoundaryFill[] {
  const fills: GlobeBoundaryFill[] = [];
  const omitHoles = options.omitHoles ?? false;

  for (const polygon of polygons) {
    const geometries = polygonToSphereGeometries(polygon, radius, omitHoles);
    geometries.forEach((geometry, partIndex) => {
      fills.push({
        id: `${polygon.id}-fill-${partIndex}`,
        geometry,
      });
    });
  }

  return fills;
}

export function buildGlobeBoundaryHitTargets(
  polygons: CountryBoundaryPolygon[],
  radius = GLOBE_BOUNDARY_HIT_RADIUS,
): GlobeBoundaryHitTarget[] {
  const targets: GlobeBoundaryHitTarget[] = [];

  for (const polygon of polygons) {
    const geometries = polygonToSphereGeometries(polygon, radius);
    geometries.forEach((geometry, partIndex) => {
      targets.push({
        id: `${polygon.id}-hit-${partIndex}`,
        countryName: polygon.countryName,
        geometry,
      });
    });
  }

  return targets;
}
