import * as THREE from "three";

import { splitRingAtAntimeridian } from "@/lib/globe-polygon-triangulation";
import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";
import { buildGreatCircleChainPositions } from "@/lib/sphere-math";
import type { LatLng } from "react-native-maps";

export const GLOBE_BOUNDARY_RADIUS = 1.004;

export function globeBoundaryRadiusAtOffset(multiplier: number): number {
  return GLOBE_BOUNDARY_RADIUS * multiplier;
}

function chainToGeometry(
  chain: LatLng[],
  radius: number,
): THREE.BufferGeometry {
  const positions = buildGreatCircleChainPositions(chain, radius);
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
  radius = GLOBE_BOUNDARY_RADIUS,
): GlobeBoundaryLine[] {
  const lines: GlobeBoundaryLine[] = [];

  for (const polygon of polygons) {
    const rings = [polygon.coordinates, ...(polygon.holes ?? [])];

    rings.forEach((ring, ringIndex) => {
      const chains = splitRingAtAntimeridian(ring);
      chains.forEach((chain, chainIndex) => {
        if (chain.length < 2) return;

        lines.push({
          id: `${polygon.id}-${ringIndex}-${chainIndex}`,
          geometry: chainToGeometry(chain, radius),
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
