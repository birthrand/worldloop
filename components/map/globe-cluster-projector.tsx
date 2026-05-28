import { useFrame, useThree } from "@react-three/fiber/native";
import { useRef } from "react";

import type { GlobeScreenPosition } from "@/lib/globe-screen-project";
import { projectLatLngToScreen } from "@/lib/globe-screen-project";
import type { MapCluster } from "@/lib/map-clusters";

type GlobeClusterProjectorProps = {
  clusters: MapCluster[];
  onPositions: (positions: GlobeScreenPosition[]) => void;
};

export function GlobeClusterProjector({
  clusters,
  onPositions,
}: GlobeClusterProjectorProps) {
  const { camera } = useThree();
  const onPositionsRef = useRef(onPositions);
  onPositionsRef.current = onPositions;
  const frameRef = useRef(0);

  useFrame((state) => {
    frameRef.current += 1;
    if (frameRef.current % 2 !== 0) return;

    const next: GlobeScreenPosition[] = clusters.map((cluster) => {
      const [lat, lng] = cluster.center;
      const projected = projectLatLngToScreen(
        lat,
        lng,
        camera,
        state.size,
      );
      return {
        id: cluster.id,
        ...projected,
      };
    });

    onPositionsRef.current(next);
  });

  return null;
}
