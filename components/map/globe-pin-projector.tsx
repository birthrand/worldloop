import { useFrame, useThree } from "@react-three/fiber/native";
import { useRef } from "react";

import type { GlobePinScreenPosition } from "@/components/map/globe-pin-overlay";
import { projectLatLngToScreen } from "@/lib/globe-screen-project";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

type GlobePinProjectorProps = {
  countries: MapCountry[];
  onPositions: (positions: GlobePinScreenPosition[]) => void;
};

export function GlobePinProjector({
  countries,
  onPositions,
}: GlobePinProjectorProps) {
  const { camera } = useThree();
  const onPositionsRef = useRef(onPositions);
  onPositionsRef.current = onPositions;

  const frameRef = useRef(0);

  useFrame((state) => {
    frameRef.current += 1;
    if (frameRef.current % 2 !== 0) return;

    const next: GlobePinScreenPosition[] = [];

    for (const country of countries) {
      if (!isValidLatLng(country.latlng)) continue;

      const [lat, lng] = getMapDisplayLatLng(country);
      const projected = projectLatLngToScreen(
        lat,
        lng,
        camera,
        state.size,
      );
      next.push({ name: country.name, ...projected });
    }

    onPositionsRef.current(next);
  });

  return null;
}
