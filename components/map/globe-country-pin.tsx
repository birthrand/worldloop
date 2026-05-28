import type { ThreeEvent } from "@react-three/fiber/native";
import { useFrame, useThree } from "@react-three/fiber/native";
import { useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";

import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  resolveRegionZoomFadeT,
} from "@/lib/map-region-markers";
import type { MapCountry } from "@/types/country";

const PIN_GEOMETRY_RADIUS = 0.018;
const BASE_SCALE = 1;
const SELECTED_SCALE = 1.55;
const BASE_EMISSIVE = 0.42;
const SELECTED_EMISSIVE = 0.95;
const PIN_COLOR = "#fbbf24";
const SELECTED_PIN_COLOR = "#FF0000";

type GlobeCountryPinProps = {
  country: MapCountry;
  position: [number, number, number];
  isSelected: boolean;
  onPress: (country: MapCountry) => void;
};

export function GlobeCountryPin({
  country,
  position,
  isSelected,
  onPress,
}: GlobeCountryPinProps) {
  const { camera } = useThree();
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (isSelected) {
      pulseRef.current += delta * 3.2;
      const pulse = 1 + Math.sin(pulseRef.current) * 0.08;
      meshRef.current.scale.setScalar(SELECTED_SCALE * pulse);

      const material = meshRef.current.material as MeshStandardMaterial;
      material.emissiveIntensity = SELECTED_EMISSIVE;
      material.opacity = 1;
      material.transparent = false;

      if (ringRef.current) {
        ringRef.current.scale.setScalar(1 + Math.sin(pulseRef.current) * 0.12);
      }
      return;
    }

    const fadeT = resolveRegionZoomFadeT(camera.position.length());
    const scale = BASE_SCALE * (1 - fadeT * 0.26);
    meshRef.current.scale.setScalar(scale);

    const material = meshRef.current.material as MeshStandardMaterial;
    material.emissiveIntensity = BASE_EMISSIVE * (1 - fadeT * 0.38);
    material.opacity = 1 - fadeT * 0.22;
    material.transparent = fadeT > 0.02;
  });

  const handlePress = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onPress(country);
  };

  const pinColor = isSelected ? SELECTED_PIN_COLOR : PIN_COLOR;
  const initialFadeT = resolveRegionZoomFadeT(
    camera.position.length() || GLOBE_DETAIL_CAMERA_DISTANCE + 0.85,
  );

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={isSelected ? SELECTED_SCALE : BASE_SCALE}
        onClick={handlePress}
      >
        <sphereGeometry args={[PIN_GEOMETRY_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={
            isSelected ? SELECTED_EMISSIVE : BASE_EMISSIVE * (1 - initialFadeT * 0.38)
          }
          transparent={!isSelected && initialFadeT > 0.02}
          opacity={isSelected ? 1 : 1 - initialFadeT * 0.22}
        />
      </mesh>

      {isSelected ? (
        <mesh ref={ringRef} onClick={handlePress}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial
            color={SELECTED_PIN_COLOR}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}
