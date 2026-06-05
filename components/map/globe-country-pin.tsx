import type { ThreeEvent } from "@react-three/fiber/native";
import { useFrame, useThree } from "@react-three/fiber/native";
import { useEffect, useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";

import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  MAP_FOCUS_TRANSITION_3D_MS,
  resolveFocusTransitionScale,
  resolveRegionZoomFadeT,
} from "@/lib/map-region-markers";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import type { MapCountry } from "@/types/country";

const PIN_GEOMETRY_RADIUS = 0.02;
const BASE_SCALE = 1.12;
const SELECTED_SCALE = 1.43;
const VISITED_RING_SCALE = 0.95;
const BASE_EMISSIVE = 0.42;
const SELECTED_EMISSIVE = 0.95;
const FOCUS_TRANSITION_EMISSIVE = 0.68;
const DEEMPHASIZED_EMISSIVE = 0.18;
const VISITED_RING_EMISSIVE = 0.38;
const PIN_COLOR = "#fbbf24";
const SELECTED_PIN_COLOR = "#fbbf24";
const VISITED_RING_COLOR = "#14b8a6";
const FOCUS_TRANSITION_DURATION_S = MAP_FOCUS_TRANSITION_3D_MS / 1000;

type GlobeCountryPinProps = {
  country: MapCountry;
  position: [number, number, number];
  isSelected: boolean;
  isFocusTransitioning?: boolean;
  isDeemphasized?: boolean;
  onPress: (country: MapCountry) => void;
  /** Skip taps that exceeded the orbit drag threshold. */
  consumeTapThresholdExceeded: () => boolean;
  /** Reset drag guard when R3F sees a new pointer down. */
  beginPointerTap: () => void;
};

export function GlobeCountryPin({
  country,
  position,
  isSelected,
  isFocusTransitioning = false,
  isDeemphasized = false,
  onPress,
  consumeTapThresholdExceeded,
  beginPointerTap,
}: GlobeCountryPinProps) {
  const { camera } = useThree();
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const transitionElapsedRef = useRef(0);
  const transitionActiveRef = useRef(false);
  const isVisited = useDiscoveryProgressStore((s) =>
    s.isCountryVisited({ name: country.name, cca2: "", flag: country.flag }),
  );
  const showVisitedRing = isVisited && !isSelected && !isFocusTransitioning;

  useEffect(() => {
    if (!isFocusTransitioning) {
      transitionActiveRef.current = false;
      transitionElapsedRef.current = 0;
      return;
    }

    transitionActiveRef.current = true;
    transitionElapsedRef.current = 0;
  }, [isFocusTransitioning]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (ringRef.current) {
      ringRef.current.visible = showVisitedRing;
    }

    if (transitionActiveRef.current) {
      transitionElapsedRef.current += delta;
      const progress = Math.min(
        1,
        transitionElapsedRef.current / FOCUS_TRANSITION_DURATION_S,
      );
      const focusScale = resolveFocusTransitionScale(progress);
      meshRef.current.scale.setScalar(BASE_SCALE * focusScale);

      const material = meshRef.current.material as MeshStandardMaterial;
      material.emissiveIntensity = FOCUS_TRANSITION_EMISSIVE;
      material.opacity = 1;
      material.transparent = false;

      if (progress >= 1) {
        transitionActiveRef.current = false;
      }
      return;
    }

    if (isSelected) {
      meshRef.current.scale.setScalar(SELECTED_SCALE);

      const material = meshRef.current.material as MeshStandardMaterial;
      material.emissiveIntensity = SELECTED_EMISSIVE;
      material.opacity = 1;
      material.transparent = false;
      return;
    }

    const fadeT = isDeemphasized
      ? 1
      : resolveRegionZoomFadeT(camera.position.length());
    const scale = BASE_SCALE * (1 - fadeT * (isDeemphasized ? 0.34 : 0.26));
    meshRef.current.scale.setScalar(scale);

    const material = meshRef.current.material as MeshStandardMaterial;
    material.emissiveIntensity = isDeemphasized
      ? DEEMPHASIZED_EMISSIVE
      : BASE_EMISSIVE * (1 - fadeT * 0.38);
    material.opacity = isDeemphasized ? 0.34 : 1 - fadeT * 0.22;
    material.transparent = isDeemphasized || fadeT > 0.02;
  });

  const handlePointerDown = () => {
    beginPointerTap();
  };

  const handlePress = (event: ThreeEvent<MouseEvent>) => {
    if (consumeTapThresholdExceeded()) return;
    event.stopPropagation();
    onPress(country);
  };

  const pinColor = isSelected ? SELECTED_PIN_COLOR : PIN_COLOR;
  const initialFadeT = isDeemphasized
    ? 1
    : resolveRegionZoomFadeT(
        camera.position.length() || GLOBE_DETAIL_CAMERA_DISTANCE + 0.85,
      );

  return (
    <group position={position}>
      {showVisitedRing ? (
        <mesh ref={ringRef} scale={VISITED_RING_SCALE}>
          <sphereGeometry args={[PIN_GEOMETRY_RADIUS, 16, 16]} />
          <meshStandardMaterial
            color={VISITED_RING_COLOR}
            emissive={VISITED_RING_COLOR}
            emissiveIntensity={VISITED_RING_EMISSIVE}
            transparent
            opacity={0.55}
          />
        </mesh>
      ) : null}
      <mesh
        ref={meshRef}
        scale={isSelected ? SELECTED_SCALE : BASE_SCALE}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePress}
      >
        <sphereGeometry args={[PIN_GEOMETRY_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={
            isSelected
              ? SELECTED_EMISSIVE
              : isDeemphasized
                ? DEEMPHASIZED_EMISSIVE
                : BASE_EMISSIVE * (1 - initialFadeT * 0.38)
          }
          transparent={!isSelected && (isDeemphasized || initialFadeT > 0.02)}
          opacity={
            isSelected ? 1 : isDeemphasized ? 0.34 : 1 - initialFadeT * 0.22
          }
        />
      </mesh>
    </group>
  );
}
