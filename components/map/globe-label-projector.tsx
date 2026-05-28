import { useFrame, useThree } from "@react-three/fiber/native";
import { useRef } from "react";

import type { GlobeLabel, GlobeLabelScreenPosition } from "@/lib/globe-labels";
import { projectLatLngToScreen } from "@/lib/globe-screen-project";

type GlobeLabelProjectorProps = {
  labels: GlobeLabel[];
  onPositions: (positions: GlobeLabelScreenPosition[]) => void;
};

/**
 * Projects only the visible label rule-set (continents + selected country).
 * Runs every other frame; parent should dedupe state updates.
 */
export function GlobeLabelProjector({
  labels,
  onPositions,
}: GlobeLabelProjectorProps) {
  const { camera } = useThree();
  const onPositionsRef = useRef(onPositions);
  onPositionsRef.current = onPositions;

  const labelsRef = useRef(labels);
  labelsRef.current = labels; // keep in sync without re-subscribing useFrame

  const frameRef = useRef(0);

  useFrame((state) => {
    frameRef.current += 1;
    if (frameRef.current % 2 !== 0) return;

    const activeLabels = labelsRef.current;
    const next: GlobeLabelScreenPosition[] = activeLabels.map((label) => {
      const projected = projectLatLngToScreen(
        label.lat,
        label.lng,
        camera,
        state.size,
      );

      return {
        id: label.id,
        type: label.type,
        ...projected,
      };
    });

    onPositionsRef.current(next);
  });

  return null;
}
