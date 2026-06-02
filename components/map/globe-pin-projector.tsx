import { useFrame, useThree } from "@react-three/fiber/native";
import { useRef, type RefObject } from "react";
import * as THREE from "three";

import { projectLatLngToScreen } from "@/lib/globe-screen-project";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

export type GlobePinScreenPosition = {
  name: string;
  x: number;
  y: number;
  visible: boolean;
};

type GlobePinProjectorProps = {
  countries: MapCountry[];
  onPositions: (positions: GlobePinScreenPosition[]) => void;
  globeQuaternionRef: RefObject<THREE.Quaternion>;
};

export function globePinPositionsChanged(
  prev: GlobePinScreenPosition[],
  next: GlobePinScreenPosition[],
): boolean {
  if (prev.length !== next.length) return true;

  return prev.some((position, index) => {
    const candidate = next[index];
    if (!candidate) return true;

    return (
      position.name !== candidate.name ||
      position.x !== candidate.x ||
      position.y !== candidate.y ||
      position.visible !== candidate.visible
    );
  });
}

/**
 * Projects country pins every other frame; parent should dedupe state updates.
 * Only returns positions on the visible hemisphere and inside the camera frustum.
 */
export function GlobePinProjector({
  countries,
  onPositions,
  globeQuaternionRef,
}: GlobePinProjectorProps) {
  const { camera } = useThree();
  const onPositionsRef = useRef(onPositions);
  onPositionsRef.current = onPositions;

  const countriesRef = useRef(countries);
  countriesRef.current = countries;

  const frameRef = useRef(0);
  const lastPositionsRef = useRef<GlobePinScreenPosition[]>([]);

  useFrame((state) => {
    frameRef.current += 1;
    if (frameRef.current % 2 !== 0) return;

    const activeCountries = countriesRef.current;
    const next: GlobePinScreenPosition[] = [];

    for (const country of activeCountries) {
      if (!isValidLatLng(country.latlng)) continue;

      const [lat, lng] = getMapDisplayLatLng(country);
      const projected = projectLatLngToScreen(
        lat,
        lng,
        camera,
        state.size,
        undefined,
        globeQuaternionRef.current ?? undefined,
      );

      next.push({
        name: country.name,
        x: projected.x,
        y: projected.y,
        visible: projected.visible,
      });
    }

    if (globePinPositionsChanged(lastPositionsRef.current, next)) {
      lastPositionsRef.current = next;
      onPositionsRef.current(next);
    }
  });

  return null;
}
