import type { ThreeEvent } from "@react-three/fiber/native";
import { useFrame } from "@react-three/fiber/native";
import { useRef } from "react";
import type { Mesh } from "three";

import { getActivityVisual } from "@/constants/map-activity";
import type { MapCluster } from "@/lib/map-clusters";

/** Slightly larger than country pins (0.018). */
const CLUSTER_PIN_RADIUS = 0.028;
const BASE_SCALE = 1;
const SELECTED_SCALE = 1.2;
const SELECTED_COLOR = "#fbbf24";

type GlobeClusterPinProps = {
  cluster: MapCluster;
  position: [number, number, number];
  isSelected: boolean;
  onPress: (cluster: MapCluster) => void;
};

export function GlobeClusterPin({
  cluster,
  position,
  isSelected,
  onPress,
}: GlobeClusterPinProps) {
  const meshRef = useRef<Mesh>(null);
  const pulseRef = useRef(0);
  const visual = getActivityVisual(cluster.activity);
  const baseColor = isSelected ? SELECTED_COLOR : visual.textColor;

  useFrame((_, delta) => {
    if (!isSelected || !meshRef.current) return;

    pulseRef.current += delta * 2.8;
    const pulse = 1 + Math.sin(pulseRef.current) * 0.06;
    meshRef.current.scale.setScalar(SELECTED_SCALE * pulse);
  });

  const handlePress = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onPress(cluster);
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={isSelected ? SELECTED_SCALE : BASE_SCALE}
        onClick={handlePress}
      >
        <sphereGeometry args={[CLUSTER_PIN_RADIUS, 18, 18]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 0.85 : 0.55}
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}
