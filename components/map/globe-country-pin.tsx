import type { ThreeEvent } from "@react-three/fiber/native";
import { useFrame } from "@react-three/fiber/native";
import { useRef } from "react";
import type { Mesh } from "three";

import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const BASE_SCALE = 1;
const SELECTED_SCALE = 1.55;
const BASE_EMISSIVE = 0.45;
const SELECTED_EMISSIVE = 0.95;
const PIN_COLOR = "#fbbf24";
const SELECTED_PIN_COLOR = "#FF0000";

type GlobeCountryPinProps = {
  country: MapCountry;
  position: [number, number, number];
};

export function GlobeCountryPin({ country, position }: GlobeCountryPinProps) {
  const selectCountry = useMapStore((s) => s.selectCountry);
  const selectedName = useMapStore((s) => s.selectedCountry?.name ?? null);
  const spotlightName = useMapUiStore((s) => s.spotlightCountryName);
  const highlightedName = selectedName ?? spotlightName;
  const isSelected = highlightedName === country.name;

  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (!isSelected || !meshRef.current) return;

    pulseRef.current += delta * 3.2;
    const pulse = 1 + Math.sin(pulseRef.current) * 0.08;
    meshRef.current.scale.setScalar(SELECTED_SCALE * pulse);

    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(pulseRef.current) * 0.12);
    }
  });

  const handlePress = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    selectCountry(country.name);
    if (useMapStore.getState().mapMode === "3d") {
      useMapStore.getState().focusCountryOnGlobe(country.name, 450);
    }
  };

  const pinColor = isSelected ? SELECTED_PIN_COLOR : PIN_COLOR;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={isSelected ? SELECTED_SCALE : BASE_SCALE}
        onClick={handlePress}
      >
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={isSelected ? SELECTED_EMISSIVE : BASE_EMISSIVE}
        />
      </mesh>

      {isSelected ? (
        <mesh ref={ringRef} onClick={handlePress}>
          <sphereGeometry args={[0.042, 16, 16]} />
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
