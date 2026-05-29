import * as THREE from "three";

import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";
import type { LatLng } from "react-native-maps";

export const GLOBE_BOUNDARY_RADIUS = 1.004;

/** Break rings where GeoJSON crosses the antimeridian so lines don't wrap the globe. */
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

function chainToGeometry(chain: LatLng[], radius: number): THREE.BufferGeometry {
  const positions = new Float32Array(chain.length * 3);
  chain.forEach((point, index) => {
    const [x, y, z] = latLngToVector3(
      point.latitude,
      point.longitude,
      radius,
    );
    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export type GlobeBoundaryLine = {
  id: string;
  geometry: THREE.BufferGeometry;
};

export function buildGlobeBoundaryLines(
  polygons: CountryBoundaryPolygon[],
): GlobeBoundaryLine[] {
  const lines: GlobeBoundaryLine[] = [];

  for (const polygon of polygons) {
    const rings = [polygon.coordinates, ...(polygon.holes ?? [])];

    rings.forEach((ring, ringIndex) => {
      const chains = splitRingAtAntimeridian(ring);
      chains.forEach((chain, chainIndex) => {
        lines.push({
          id: `${polygon.id}-${ringIndex}-${chainIndex}`,
          geometry: chainToGeometry(chain, GLOBE_BOUNDARY_RADIUS),
        });
      });
    });
  }

  return lines;
}

export function parseCssColorToThree(color: string): {
  threeColor: THREE.Color;
  opacity: number;
} {
  const rgbaMatch = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return {
      threeColor: new THREE.Color(
        Number(r) / 255,
        Number(g) / 255,
        Number(b) / 255,
      ),
      opacity: a !== undefined ? Number(a) : 1,
    };
  }

  return {
    threeColor: new THREE.Color(color),
    opacity: 1,
  };
}
