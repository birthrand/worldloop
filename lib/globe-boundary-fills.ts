import * as THREE from "three";

import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";
import type { LatLng } from "react-native-maps";

export const GLOBE_FILL_RADIUS = 1.003;

/** Break rings where GeoJSON crosses the antimeridian so fills don't wrap the globe. */
function splitRingAtAntimeridian(ring: LatLng[]): LatLng[][] {
  if (ring.length < 2) return [];

  const chains: LatLng[][] = [];
  let current: LatLng[] = [ring[0]!];

  for (let i = 1; i < ring.length; i++) {
    const prev = ring[i - 1]!;
    const next = ring[i]!;
    if (Math.abs(next.longitude - prev.longitude) > 180) {
      if (current.length >= 2) chains.push(current);
      current = [next];
      continue;
    }
    current.push(next);
  }

  if (current.length >= 2) {
    chains.push(current);
  }

  return chains;
}

function dedupeClosingPoint(ring: LatLng[]): LatLng[] {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return ring.slice(0, -1);
  }
  return ring;
}

function ringToFanGeometry(
  ring: LatLng[],
  radius: number,
): THREE.BufferGeometry | null {
  const points = dedupeClosingPoint(ring);
  if (points.length < 3) return null;

  const unitVectors = points.map((point) => {
    const [x, y, z] = latLngToVector3(point.latitude, point.longitude, 1);
    return new THREE.Vector3(x, y, z).normalize();
  });

  const centroid = new THREE.Vector3();
  for (const vector of unitVectors) {
    centroid.add(vector);
  }
  if (centroid.lengthSq() < 1e-8) return null;
  centroid.normalize().multiplyScalar(radius);

  const positions = new Float32Array((unitVectors.length + 1) * 3);
  positions[0] = centroid.x;
  positions[1] = centroid.y;
  positions[2] = centroid.z;

  unitVectors.forEach((vector, index) => {
    const scaled = vector.clone().multiplyScalar(radius);
    const offset = (index + 1) * 3;
    positions[offset] = scaled.x;
    positions[offset + 1] = scaled.y;
    positions[offset + 2] = scaled.z;
  });

  const indices: number[] = [];
  for (let i = 1; i < unitVectors.length; i++) {
    indices.push(0, i, i + 1);
  }
  indices.push(0, unitVectors.length, 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export type GlobeBoundaryFill = {
  id: string;
  geometry: THREE.BufferGeometry;
};

export function buildGlobeBoundaryFills(
  polygons: CountryBoundaryPolygon[],
): GlobeBoundaryFill[] {
  const fills: GlobeBoundaryFill[] = [];

  for (const polygon of polygons) {
    const chains = splitRingAtAntimeridian(polygon.coordinates);
    chains.forEach((chain, chainIndex) => {
      const geometry = ringToFanGeometry(chain, GLOBE_FILL_RADIUS);
      if (!geometry) return;
      fills.push({
        id: `${polygon.id}-fill-${chainIndex}`,
        geometry,
      });
    });
  }

  return fills;
}
