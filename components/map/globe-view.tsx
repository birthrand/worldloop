import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber/native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

import { GlobeBoundaryHitTargets } from "@/components/map/globe-boundary-hit-targets";
import { GlobeBoundaryLines } from "@/components/map/globe-boundary-lines";
import { GlobeContinentFocusLayers } from "@/components/map/globe-continent-focus-layers";
import { GlobeCountryFocusLayers } from "@/components/map/globe-country-focus-layers";
import { GlobeCountryPin } from "@/components/map/globe-country-pin";
import { GlobeFlagOverlay } from "@/components/map/globe-flag-overlay";
import { GlobeLabelOverlay } from "@/components/map/globe-label-overlay";
import { GlobeLabelProjector } from "@/components/map/globe-label-projector";
import {
  GlobePinProjector,
  globePinPositionsChanged,
  type GlobePinScreenPosition,
} from "@/components/map/globe-pin-projector";
import {
  buildGlobeVisibleLabels,
  globeLabelPositionsChanged,
  type GlobeLabelScreenPosition,
} from "@/lib/globe-labels";
import {
  createGlobeOrbitControls,
  type GlobeOrbitControls,
} from "@/lib/globe-orbit-controls";
import {
  GLOBE_AUTO_ROTATE_ENABLED,
  GLOBE_AUTO_ROTATE_INACTIVITY_MS,
  GLOBE_AUTO_ROTATE_SPEED,
  GLOBE_CAMERA_VIEW_DIRECTION,
  globeQuaternionDeltaForCameraOrbit,
  latLngFromWorldNormal,
  quaternionForLatLngFacingCamera,
  viewCenterLatLngFromGlobeQuaternion,
} from "@/lib/globe-rotation";
import {
  projectLatLngToScreen,
  type GlobeScreenPosition,
} from "@/lib/globe-screen-project";
import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import { useGlobeTexture } from "@/lib/load-globe-texture";
import type { MapCluster } from "@/lib/map-clusters";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import { shouldFillCountryHighlightGaps } from "@/lib/map-country-focus-polygons";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";
import {
  GLOBE_WORLD_CAMERA_DISTANCE,
  resolveGlobeZoomTier,
  type GlobeZoomTier,
} from "@/lib/map-region-markers";
import { useMapStore, type GlobeCameraHandle } from "@/store/use-map-store";
import {
  isGlobeYellowPinsVisible,
  type CountryMarkerDisplayMode,
} from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

export type GlobeCameraViewState = {
  distance: number;
  centerLat: number;
  centerLng: number;
  zoomTier: GlobeZoomTier;
};

// Some Three.js RN helpers expect THREE on globalThis.
const globalWithThree = globalThis as typeof globalThis & {
  THREE?: typeof THREE;
};
globalWithThree.THREE = globalWithThree.THREE ?? THREE;

const GLOBE_RADIUS = 1;
const PIN_RADIUS = GLOBE_RADIUS * 1.02;
const MIN_CAMERA_DISTANCE = 1.4;
const MAX_CAMERA_DISTANCE = 5;
/** World view — matches `GLOBE_WORLD_CAMERA_DISTANCE` / map controller framing. */
const DEFAULT_CAMERA_DISTANCE = GLOBE_WORLD_CAMERA_DISTANCE;
/** Pull target below equator so the sphere sits in the map “stage” between chrome. */
const GLOBE_VIEW_TARGET_Y = -0.09;

/** Atlantic-centered view — Americas sit in-frame without left-edge label crop. */
const INITIAL_CAMERA_POSITION = latLngToVector3(
  4,
  -36,
  DEFAULT_CAMERA_DISTANCE,
);

type GlobeRotationFlight = {
  fromQuat: THREE.Quaternion;
  toQuat: THREE.Quaternion;
  fromDistance: number;
  toDistance: number;
  elapsed: number;
  duration: number;
};

/** Ease-in-out cubic — smooth start/end for globe pans. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const flightScratchQuat = new THREE.Quaternion();
const orbitPrevDir = new THREE.Vector3();
const orbitNextDir = new THREE.Vector3();
const orbitDeltaQuat = new THREE.Quaternion();

/** Fires once after the GL canvas renders its first frame. */
function GlobePaintNotifier({ onPainted }: { onPainted: () => void }) {
  const paintedRef = useRef(false);

  useFrame(() => {
    if (paintedRef.current) return;
    paintedRef.current = true;
    onPainted();
  });

  return null;
}

type LatLngProjector = (
  lat: number,
  lng: number,
) => Pick<GlobeScreenPosition, "x" | "y" | "visible">;

function GlobeCoordinateProjector({
  layoutSize,
  onReady,
  globeQuaternionRef,
}: {
  layoutSize: { width: number; height: number };
  onReady: (project: LatLngProjector) => void;
  globeQuaternionRef: RefObject<THREE.Quaternion>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    onReady((lat, lng) =>
      projectLatLngToScreen(
        lat,
        lng,
        camera,
        layoutSize,
        undefined,
        globeQuaternionRef.current ?? undefined,
      ),
    );
  }, [camera, globeQuaternionRef, layoutSize, onReady]);

  return null;
}

type GlobeSceneProps = {
  countries: MapCountry[];
  visibleLabels: ReturnType<typeof buildGlobeVisibleLabels>;
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusTransitionName: string | null;
  focusedRegion: string | null;
  /** Effective region for boundary outlines + tap targets (may infer from view center). */
  boundaryFocusRegion?: string | null;
  zoomTier: GlobeZoomTier;
  previewRegion?: string | null;
  showGlobePins: boolean;
  onCountryPress: (country: MapCountry) => void;
  onBoundaryCountryPress: (country: MapCountry) => void;
  controls: GlobeOrbitControls;
  onReady: (handle: GlobeCameraHandle) => void;
  onCanvasPainted?: () => void;
  onLabelPositions: (positions: GlobeLabelScreenPosition[]) => void;
  onPinPositions: (positions: GlobePinScreenPosition[]) => void;
  onCameraViewChange?: (state: GlobeCameraViewState) => void;
  onGlobeSurfacePress: (coordinate: MapPressCoordinate) => void;
  layoutSize: { width: number; height: number };
  onProjectorReady: (project: LatLngProjector) => void;
  lockUserGestures: boolean;
  /** False when a country or continent is anchored — disables idle spin. */
  autoRotateEnabled: boolean;
  /** Seeds globe distance from the map controller (2D latitudeDelta sync). */
  initialCameraDistance?: number;
};

function GlobeScene({
  countries,
  visibleLabels,
  boundaryCountries,
  selectedName,
  focusTransitionName,
  focusedRegion,
  boundaryFocusRegion = focusedRegion,
  zoomTier,
  previewRegion = null,
  showGlobePins,
  onCountryPress,
  onBoundaryCountryPress,
  controls,
  onReady,
  onCanvasPainted,
  onLabelPositions,
  onPinPositions,
  onCameraViewChange,
  onGlobeSurfacePress,
  layoutSize,
  onProjectorReady,
  lockUserGestures,
  autoRotateEnabled,
  initialCameraDistance = DEFAULT_CAMERA_DISTANCE,
}: GlobeSceneProps) {
  const texture = useGlobeTexture();
  const { camera } = useThree();
  const globeGroupRef = useRef<THREE.Group>(null);
  const globeQuaternionRef = useRef(new THREE.Quaternion());
  const nearbyFlagPinMode =
    !!focusedRegion && (!!selectedName || !!focusTransitionName);
  const fillCountryHighlightGaps =
    !selectedName &&
    shouldFillCountryHighlightGaps(focusedRegion, previewRegion);

  const handlePinPress = useCallback(
    (country: MapCountry) => {
      onCountryPress(country);
    },
    [onCountryPress],
  );

  const handleGlobeSurfacePointerDown = useCallback(() => {
    controls.functions.beginPointerTap();
  }, [controls.functions]);

  const handleGlobeSurfacePress = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (controls.functions.consumeTapThresholdExceeded()) {
        return;
      }
      event.stopPropagation();
      const globe = globeGroupRef.current;
      if (!globe) return;
      const [latitude, longitude] = latLngFromWorldNormal(
        event.point,
        globe.quaternion,
      );
      onGlobeSurfacePress({ latitude, longitude });
    },
    [controls.functions, onGlobeSurfacePress],
  );

  const flightRef = useRef<GlobeRotationFlight | null>(null);
  /** Pauses idle spin after user drag until inactivity timeout elapses. */
  const userExploringRef = useRef(false);
  const lastInteractionEndedAtRef = useRef(0);
  const cameraDistanceRef = useRef(initialCameraDistance);
  const onCameraViewChangeRef = useRef(onCameraViewChange);
  onCameraViewChangeRef.current = onCameraViewChange;
  const lastCameraViewKeyRef = useRef("");

  const snapOrbitFromFixedCamera = useCallback(() => {
    controls.functions.snapCameraToFixedView(
      GLOBE_CAMERA_VIEW_DIRECTION,
      controls.scope.target,
      cameraDistanceRef.current,
    );
  }, [controls.functions, controls.scope.target]);

  const resetOrbitFromFixedCamera = useCallback(() => {
    controls.functions.resetOrbitToFixedView(
      GLOBE_CAMERA_VIEW_DIRECTION,
      controls.scope.target,
      cameraDistanceRef.current,
    );
  }, [controls.functions, controls.scope.target]);

  const syncGlobeQuaternionRef = useCallback(() => {
    const globe = globeGroupRef.current;
    if (globe) {
      globeQuaternionRef.current.copy(globe.quaternion);
    }
  }, []);

  const emitCameraView = useCallback(() => {
    const distance = cameraDistanceRef.current;
    const globe = globeGroupRef.current;
    const [centerLat, centerLng] = globe
      ? viewCenterLatLngFromGlobeQuaternion(globe.quaternion)
      : ([0, 0] as [number, number]);
    const zoomTier = resolveGlobeZoomTier(distance);
    const key = `${zoomTier}:${distance.toFixed(2)}:${centerLat.toFixed(1)}:${centerLng.toFixed(1)}`;
    if (key === lastCameraViewKeyRef.current) return;
    lastCameraViewKeyRef.current = key;
    onCameraViewChangeRef.current?.({
      distance,
      centerLat,
      centerLng,
      zoomTier,
    });
  }, []);

  const [visibleCirclePinNames, setVisibleCirclePinNames] = useState<
    Set<string>
  >(() => new Set());

  const handlePinPositions = useCallback(
    (positions: GlobePinScreenPosition[]) => {
      if (!showGlobePins) return;

      onPinPositions(positions);

      if (nearbyFlagPinMode) return;

      const visible = new Set(
        positions.filter((p) => p.visible).map((p) => p.name),
      );
      setVisibleCirclePinNames((prev) => {
        if (prev.size === visible.size) {
          let same = true;
          for (const name of visible) {
            if (!prev.has(name)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return visible;
      });
    },
    [nearbyFlagPinMode, onPinPositions, showGlobePins],
  );

  const focusLatLng = useCallback(
    (lat: number, lng: number, duration = 650, targetDistance?: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const globe = globeGroupRef.current;
      if (!globe) return;

      const fromDistance = cameraDistanceRef.current;
      const toDistance = targetDistance ?? fromDistance;

      flightRef.current = {
        fromQuat: globe.quaternion.clone(),
        toQuat: quaternionForLatLngFacingCamera(lat, lng),
        fromDistance,
        toDistance,
        elapsed: 0,
        duration: duration / 1000,
      };
    },
    [],
  );

  const focusCountry = useCallback(
    (country: MapCountry, duration = 650) => {
      const [lat, lng] = getMapDisplayLatLng(country);
      if (!isValidLatLng([lat, lng])) return;
      focusLatLng(lat, lng, duration);
    },
    [focusLatLng],
  );

  const resetCamera = useCallback(() => {
    const globe = globeGroupRef.current;
    if (!globe) return;

    const fromDistance = cameraDistanceRef.current;

    flightRef.current = {
      fromQuat: globe.quaternion.clone(),
      toQuat: new THREE.Quaternion(),
      fromDistance,
      toDistance: DEFAULT_CAMERA_DISTANCE,
      elapsed: 0,
      duration: 0.55,
    };
    // cameraDistanceRef.current = DEFAULT_CAMERA_DISTANCE;
    controls.scope.target.set(0, GLOBE_VIEW_TARGET_Y, 0);
    resetOrbitFromFixedCamera();
  }, [controls.scope.target, resetOrbitFromFixedCamera]);

  const zoomBy = useCallback(
    (direction: "in" | "out") => {
      flightRef.current = null;

      const scale = direction === "in" ? 0.82 : 1.22;
      const fromDistance = cameraDistanceRef.current;
      const nextDistance = THREE.MathUtils.clamp(
        fromDistance * scale,
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      );
      cameraDistanceRef.current = nextDistance;
      resetOrbitFromFixedCamera();
      syncGlobeQuaternionRef();
      emitCameraView();
    },
    [
      controls.functions,
      emitCameraView,
      resetOrbitFromFixedCamera,
      syncGlobeQuaternionRef,
    ],
  );

  const appliedInitialCameraDistanceRef = useRef(false);
  useEffect(() => {
    if (
      appliedInitialCameraDistanceRef.current ||
      initialCameraDistance == null
    ) {
      return;
    }
    appliedInitialCameraDistanceRef.current = true;
    cameraDistanceRef.current = initialCameraDistance;
    resetOrbitFromFixedCamera();
  }, [initialCameraDistance, resetOrbitFromFixedCamera]);

  useEffect(() => {
    if (autoRotateEnabled) {
      userExploringRef.current = false;
    }
  }, [autoRotateEnabled]);

  useEffect(() => {
    if (!flightRef.current) {
      controls.scope.enabled = !lockUserGestures;
    }
  }, [controls.scope, lockUserGestures]);

  useEffect(() => {
    controls.scope.camera = camera as THREE.PerspectiveCamera;
    controls.scope.target.set(0, GLOBE_VIEW_TARGET_Y, 0);
    resetOrbitFromFixedCamera();
    controls.scope.enablePan = false;
    controls.scope.dampingFactor = 0.05;
    controls.scope.rotateSpeed = 0.9;
    controls.scope.zoomSpeed = 0.5;
    controls.scope.minZoom = MIN_CAMERA_DISTANCE;
    controls.scope.maxZoom = MAX_CAMERA_DISTANCE;
    controls.scope.onChange = () => {
      if (!controls.functions.isZoomInteraction()) return;

      const fromDistance = cameraDistanceRef.current;
      const nextDistance = THREE.MathUtils.clamp(
        camera.position.distanceTo(controls.scope.target),
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      );
      if (Math.abs(nextDistance - fromDistance) < 0.01) return;

      cameraDistanceRef.current = nextDistance;
      emitCameraView();
    };
    controls.scope.onStart = () => {
      flightRef.current = null;
      userExploringRef.current = true;
    };
    controls.scope.onEnd = () => {
      lastInteractionEndedAtRef.current = Date.now();
    };
  }, [
    camera,
    controls.functions,
    controls.scope,
    emitCameraView,
    resetOrbitFromFixedCamera,
  ]);

  useEffect(() => {
    const handle: GlobeCameraHandle = {
      focusCountry,
      focusLatLng,
      resetCamera,
      zoomBy,
    };
    onReady(handle);
    useMapStore.getState().registerGlobeCamera(handle);
    return () => useMapStore.getState().registerGlobeCamera(null);
  }, [focusCountry, focusLatLng, onReady, resetCamera, zoomBy]);

  useFrame((_, delta) => {
    const globe = globeGroupRef.current;
    const flight = flightRef.current;

    if (flight && globe) {
      controls.scope.enabled = false;
      flight.elapsed += delta;
      const progress = Math.min(flight.elapsed / flight.duration, 1);
      const eased = easeInOutCubic(progress);

      flightScratchQuat.slerpQuaternions(flight.fromQuat, flight.toQuat, eased);
      globe.quaternion.copy(flightScratchQuat);

      cameraDistanceRef.current = THREE.MathUtils.lerp(
        flight.fromDistance,
        flight.toDistance,
        eased,
      );
      snapOrbitFromFixedCamera();
      syncGlobeQuaternionRef();

      if (progress >= 1) {
        flightRef.current = null;
        cameraDistanceRef.current = flight.toDistance;
        resetOrbitFromFixedCamera();
        controls.scope.enabled = !lockUserGestures;
        emitCameraView();
      }
      return;
    }

    controls.scope.enabled = !lockUserGestures;

    if (globe) {
      if (controls.functions.hasActiveMomentum()) {
        orbitPrevDir
          .copy(camera.position)
          .sub(controls.scope.target)
          .normalize();
        controls.functions.update();
        orbitNextDir
          .copy(camera.position)
          .sub(controls.scope.target)
          .normalize();

        if (orbitPrevDir.angleTo(orbitNextDir) > 0.0001) {
          globe.quaternion.premultiply(
            globeQuaternionDeltaForCameraOrbit(orbitPrevDir, orbitNextDir),
          );
        }

        if (controls.functions.isZoomInteraction()) {
          const distance = THREE.MathUtils.clamp(
            camera.position.distanceTo(controls.scope.target),
            MIN_CAMERA_DISTANCE,
            MAX_CAMERA_DISTANCE,
          );
          if (Math.abs(distance - cameraDistanceRef.current) > 0.01) {
            cameraDistanceRef.current = distance;
            emitCameraView();
          }
        }
      } else if (
        GLOBE_AUTO_ROTATE_ENABLED &&
        autoRotateEnabled &&
        !lockUserGestures &&
        !controls.functions.isActiveInteraction() &&
        !controls.functions.hasActiveMomentum()
      ) {
        const inactivityElapsed =
          Date.now() - lastInteractionEndedAtRef.current >=
          GLOBE_AUTO_ROTATE_INACTIVITY_MS;

        if (!userExploringRef.current || inactivityElapsed) {
          if (userExploringRef.current && inactivityElapsed) {
            userExploringRef.current = false;
          }
          globe.rotateY(GLOBE_AUTO_ROTATE_SPEED * delta);
          emitCameraView();
        }
      }

      snapOrbitFromFixedCamera();
      syncGlobeQuaternionRef();
    }
  });

  return (
    <>
      {onCanvasPainted ? (
        <GlobePaintNotifier onPainted={onCanvasPainted} />
      ) : null}
      <color attach="background" args={["#000000"]} />

      <ambientLight intensity={3} />
      <directionalLight position={[5, 3, 5]} intensity={2} />

      <group ref={globeGroupRef}>
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={texture ?? undefined}
            color={texture ? "#ffffff" : "#1a1a2e"}
            emissive={texture ? "#000000" : "#3d3520"}
            emissiveIntensity={texture ? 0 : 0.12}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
        <mesh
          onPointerDown={handleGlobeSurfacePointerDown}
          onPointerUp={handleGlobeSurfacePress}
        >
          <sphereGeometry args={[GLOBE_RADIUS * 1.01, 64, 64]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <GlobeContinentFocusLayers
          focusedRegion={focusedRegion}
          previewRegion={previewRegion}
          selectedCountryName={selectedName}
          boundaryCountries={boundaryCountries}
        />

        <GlobeBoundaryLines
          boundaryCountries={boundaryCountries}
          selectedName={selectedName}
          focusTransitionName={focusTransitionName}
          focusedRegion={focusedRegion}
          boundaryFocusRegion={boundaryFocusRegion}
          zoomTier={zoomTier}
        />

        <GlobeBoundaryHitTargets
          boundaryCountries={boundaryCountries}
          selectedName={selectedName}
          focusedRegion={focusedRegion}
          boundaryFocusRegion={boundaryFocusRegion}
          zoomTier={zoomTier}
          onBoundaryCountryPress={onBoundaryCountryPress}
          consumeTapThresholdExceeded={
            controls.functions.consumeTapThresholdExceeded
          }
          beginPointerTap={controls.functions.beginPointerTap}
        />

        <GlobeCountryFocusLayers
          selectedCountryName={selectedName}
          focusTransitionName={focusTransitionName}
          fillGapsWhenContinentOverlay={fillCountryHighlightGaps}
        />

        {showGlobePins && !nearbyFlagPinMode
          ? countries.map((country) => {
              if (!isValidLatLng(country.latlng)) return null;
              const focusCountryName =
                selectedName ?? focusTransitionName ?? null;
              const isSelected = focusCountryName === country.name;
              const isFocusTransitioning =
                !!focusTransitionName &&
                focusTransitionName === country.name &&
                selectedName !== country.name;
              const keepVisible =
                isSelected ||
                isFocusTransitioning ||
                visibleCirclePinNames.has(country.name);
              if (!keepVisible) {
                return null;
              }
              const [lat, lng] = getMapDisplayLatLng(country);
              return (
                <GlobeCountryPin
                  key={country.name}
                  country={country}
                  position={latLngToVector3(lat, lng, PIN_RADIUS)}
                  isSelected={isSelected}
                  isFocusTransitioning={isFocusTransitioning}
                  isDeemphasized={
                    !!focusCountryName && !isSelected && !isFocusTransitioning
                  }
                  onPress={handlePinPress}
                  consumeTapThresholdExceeded={
                    controls.functions.consumeTapThresholdExceeded
                  }
                  beginPointerTap={controls.functions.beginPointerTap}
                />
              );
            })
          : null}
      </group>

      <GlobeCoordinateProjector
        layoutSize={layoutSize}
        onReady={onProjectorReady}
        globeQuaternionRef={globeQuaternionRef}
      />

      <GlobeLabelProjector
        labels={visibleLabels}
        onPositions={onLabelPositions}
        globeQuaternionRef={globeQuaternionRef}
      />

      {showGlobePins ? (
        <GlobePinProjector
          countries={countries}
          onPositions={handlePinPositions}
          globeQuaternionRef={globeQuaternionRef}
        />
      ) : null}
    </>
  );
}

export type GlobeViewHandle = GlobeCameraHandle & {
  projectLatLng: (
    lat: number,
    lng: number,
  ) => Pick<GlobeScreenPosition, "x" | "y" | "visible">;
};

type GlobeViewProps = {
  countries: MapCountry[];
  clusters: MapCluster[];
  /** Full continent clusters — used for label anchors even when region pins are hidden. */
  labelClusters: MapCluster[];
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusTransitionName?: string | null;
  focusedRegion: string | null;
  boundaryFocusRegion?: string | null;
  /** Live globe camera tier from the map controller (stroke scaling). */
  zoomTier?: GlobeZoomTier;
  previewRegion?: string | null;
  countryMarkerMode?: CountryMarkerDisplayMode;
  onClusterPress: (cluster: MapCluster) => void;
  onCountryPress: (country: MapCountry) => void;
  onBoundaryCountryPress: (country: MapCountry) => void;
  onBackgroundPress: (coordinate?: MapPressCoordinate) => void;
  onCanvasPainted?: () => void;
  onCameraViewChange?: (state: GlobeCameraViewState) => void;
  lockUserGestures?: boolean;
  autoRotateEnabled?: boolean;
  /** Seeds globe distance from the map controller when entering 3D. */
  initialCameraDistance?: number;
};

export const GlobeView = forwardRef<GlobeViewHandle, GlobeViewProps>(
  function GlobeView(
    {
      countries,
      clusters,
      labelClusters,
      boundaryCountries,
      selectedName,
      focusTransitionName = null,
      focusedRegion,
      boundaryFocusRegion = focusedRegion,
      zoomTier = "world",
      previewRegion = null,
      countryMarkerMode = "flag",
      onClusterPress,
      onCountryPress,
      onBoundaryCountryPress,
      onBackgroundPress,
      onCanvasPainted,
      onCameraViewChange,
      lockUserGestures = false,
      autoRotateEnabled = true,
      initialCameraDistance,
    },
    ref,
  ) {
    const handleRef = useRef<GlobeCameraHandle | null>(null);
    const projectLatLngRef = useRef<LatLngProjector | null>(null);
    const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 });
    const controls = useMemo(() => createGlobeOrbitControls(), []);
    const [labelPositions, setLabelPositions] = useState<
      GlobeLabelScreenPosition[]
    >([]);
    const [flagPinPositions, setFlagPinPositions] = useState<
      GlobePinScreenPosition[]
    >([]);
    const nearbyFlagPinMode =
      !!focusedRegion && (!!selectedName || !!focusTransitionName);
    const showGlobePins =
      !!focusedRegion &&
      countries.length > 0 &&
      isGlobeYellowPinsVisible(countryMarkerMode);
    const showNearbyFlagPins =
      nearbyFlagPinMode && countryMarkerMode === "flag";

    const selectedCountry = useMemo(
      () =>
        selectedName
          ? (countries.find((country) => country.name === selectedName) ?? null)
          : null,
      [countries, selectedName],
    );

    const visibleLabels = useMemo(
      () =>
        buildGlobeVisibleLabels({
          clusters: labelClusters,
          selectedCountry,
        }),
      [labelClusters, selectedCountry],
    );

    const continentClustersByRegion = useMemo(
      () => new Map(labelClusters.map((cluster) => [cluster.region, cluster])),
      [labelClusters],
    );

    const handleLabelPositions = useCallback(
      (positions: GlobeLabelScreenPosition[]) => {
        setLabelPositions((prev) => {
          if (!globeLabelPositionsChanged(prev, positions)) {
            return prev;
          }
          return positions;
        });
      },
      [],
    );

    const handlePinPositions = useCallback(
      (positions: GlobePinScreenPosition[]) => {
        setFlagPinPositions((prev) => {
          if (!globePinPositionsChanged(prev, positions)) {
            return prev;
          }
          return positions;
        });
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        focusCountry: (country, duration) =>
          handleRef.current?.focusCountry(country, duration),
        focusLatLng: (lat, lng, duration, targetDistance) =>
          handleRef.current?.focusLatLng(lat, lng, duration, targetDistance),
        resetCamera: () => handleRef.current?.resetCamera(),
        zoomBy: (direction) => handleRef.current?.zoomBy(direction),
        projectLatLng: (lat, lng) =>
          projectLatLngRef.current?.(lat, lng) ?? {
            x: 0,
            y: 0,
            visible: false,
          },
      }),
      [],
    );

    const handleProjectorReady = useCallback((project: LatLngProjector) => {
      projectLatLngRef.current = project;
    }, []);

    const handleReady = useCallback((handle: GlobeCameraHandle) => {
      handleRef.current = handle;
    }, []);

    const handleBackgroundPress = useCallback(() => {
      onBackgroundPress();
    }, [onBackgroundPress]);
    const handleGlobeSurfacePress = useCallback(
      (coordinate: MapPressCoordinate) => {
        onBackgroundPress(coordinate);
      },
      [onBackgroundPress],
    );

    const handleContinentLabelPress = useCallback(
      (cluster: MapCluster) => {
        if (controls.functions.consumeTapThresholdExceeded()) {
          return;
        }
        onClusterPress(cluster);
      },
      [controls.functions, onClusterPress],
    );

    return (
      <View
        style={styles.container}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setLayoutSize({ width, height });
          controls.events.onLayout(event);
        }}
        onStartShouldSetResponder={controls.events.onStartShouldSetResponder}
        onMoveShouldSetResponder={controls.events.onMoveShouldSetResponder}
        onResponderGrant={controls.events.onResponderGrant}
        onResponderMove={controls.events.onResponderMove}
        onResponderRelease={controls.events.onResponderRelease}
        onResponderTerminate={controls.events.onResponderTerminate}
        onResponderTerminationRequest={
          controls.events.onResponderTerminationRequest
        }
      >
        <Canvas
          style={styles.canvas}
          camera={{
            position: INITIAL_CAMERA_POSITION,
            fov: 42,
            near: 0.1,
            far: 120,
          }}
          gl={{ antialias: true }}
          onPointerMissed={handleBackgroundPress}
        >
          <GlobeScene
            countries={countries}
            visibleLabels={visibleLabels}
            boundaryCountries={boundaryCountries}
            selectedName={selectedName}
            focusTransitionName={focusTransitionName}
            focusedRegion={focusedRegion}
            boundaryFocusRegion={boundaryFocusRegion}
            zoomTier={zoomTier}
            previewRegion={previewRegion}
            showGlobePins={showGlobePins}
            onCountryPress={onCountryPress}
            onBoundaryCountryPress={onBoundaryCountryPress}
            controls={controls}
            onReady={handleReady}
            onCanvasPainted={onCanvasPainted}
            onLabelPositions={handleLabelPositions}
            onPinPositions={handlePinPositions}
            onCameraViewChange={onCameraViewChange}
            onGlobeSurfacePress={handleGlobeSurfacePress}
            layoutSize={layoutSize}
            onProjectorReady={handleProjectorReady}
            lockUserGestures={lockUserGestures}
            autoRotateEnabled={autoRotateEnabled}
            initialCameraDistance={initialCameraDistance}
          />
        </Canvas>

        <GlobeLabelOverlay
          labels={visibleLabels}
          positions={labelPositions}
          layoutSize={layoutSize}
          focusedRegion={focusedRegion}
          continentClustersByRegion={continentClustersByRegion}
          onContinentPress={handleContinentLabelPress}
        />

        {showNearbyFlagPins ? (
          <GlobeFlagOverlay
            countries={countries}
            positions={flagPinPositions}
            selectedName={selectedName}
            focusTransitionName={focusTransitionName}
            onCountryPress={onCountryPress}
          />
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  canvas: {
    flex: 1,
  },
});
