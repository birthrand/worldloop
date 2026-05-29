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
} from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

import { GlobeBoundaryLines } from "@/components/map/globe-boundary-lines";
import { GlobeCountryPin } from "@/components/map/globe-country-pin";
import { GlobeLabelOverlay } from "@/components/map/globe-label-overlay";
import { GlobeLabelProjector } from "@/components/map/globe-label-projector";
import {
  GlobePinProjector,
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
  projectLatLngToScreen,
  type GlobeScreenPosition,
} from "@/lib/globe-screen-project";
import { latLngToVector3, vector3ToLatLng } from "@/lib/latlng-to-sphere";
import { useGlobeTexture } from "@/lib/load-globe-texture";
import type { MapCluster } from "@/lib/map-clusters";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";
import {
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
const MAX_CAMERA_DISTANCE = 4;
/** World view — slightly closer than before so the globe fills more of the stage. */
const DEFAULT_CAMERA_DISTANCE = 3.88;
/** Pull target below equator so the sphere sits in the map “stage” between chrome. */
const GLOBE_VIEW_TARGET_Y = -0.09;

/** Atlantic-centered view — Americas sit in-frame without left-edge label crop. */
const INITIAL_CAMERA_POSITION = latLngToVector3(
  4,
  -36,
  DEFAULT_CAMERA_DISTANCE,
);

type CameraFlight = {
  fromDir: THREE.Vector3;
  toDir: THREE.Vector3;
  fromDistance: number;
  toDistance: number;
  elapsed: number;
  duration: number;
};

/** Ease-in-out cubic — smooth start/end for globe pans. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const SLERP_REFERENCE = new THREE.Vector3(0, 0, 1);
const slerpScratchDir = new THREE.Vector3();
const slerpScratchQuatA = new THREE.Quaternion();
const slerpScratchQuatB = new THREE.Quaternion();
const slerpScratchQuat = new THREE.Quaternion();

function slerpUnitVectors(
  from: THREE.Vector3,
  to: THREE.Vector3,
  alpha: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  slerpScratchQuatA.setFromUnitVectors(SLERP_REFERENCE, from);
  slerpScratchQuatB.setFromUnitVectors(SLERP_REFERENCE, to);
  slerpScratchQuat.slerpQuaternions(
    slerpScratchQuatA,
    slerpScratchQuatB,
    alpha,
  );
  return target.copy(SLERP_REFERENCE).applyQuaternion(slerpScratchQuat);
}

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
}: {
  layoutSize: { width: number; height: number };
  onReady: (project: LatLngProjector) => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    onReady((lat, lng) => projectLatLngToScreen(lat, lng, camera, layoutSize));
  }, [camera, layoutSize, onReady]);

  return null;
}

type GlobeSceneProps = {
  countries: MapCountry[];
  visibleLabels: ReturnType<typeof buildGlobeVisibleLabels>;
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusTransitionName: string | null;
  focusedRegion: string | null;
  showGlobePins: boolean;
  onCountryPress: (country: MapCountry) => void;
  controls: GlobeOrbitControls;
  onReady: (handle: GlobeCameraHandle) => void;
  onCanvasPainted?: () => void;
  onLabelPositions: (positions: GlobeLabelScreenPosition[]) => void;
  onCameraViewChange?: (state: GlobeCameraViewState) => void;
  onGlobeSurfacePress: (coordinate: MapPressCoordinate) => void;
  layoutSize: { width: number; height: number };
  onProjectorReady: (project: LatLngProjector) => void;
  lockUserGestures: boolean;
};

function GlobeScene({
  countries,
  visibleLabels,
  boundaryCountries,
  selectedName,
  focusTransitionName,
  focusedRegion,
  showGlobePins,
  onCountryPress,
  controls,
  onReady,
  onCanvasPainted,
  onLabelPositions,
  onCameraViewChange,
  onGlobeSurfacePress,
  layoutSize,
  onProjectorReady,
  lockUserGestures,
}: GlobeSceneProps) {
  const texture = useGlobeTexture();
  const { camera } = useThree();
  const continentSinglePinActive =
    !!focusedRegion && (!!selectedName || !!focusTransitionName);

  const handlePinPress = useCallback(
    (country: MapCountry) => {
      onCountryPress(country);
    },
    [onCountryPress],
  );

  const handleGlobeSurfacePress = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (controls.functions.consumeTapThresholdExceeded()) {
        return;
      }
      event.stopPropagation();
      const normal = event.point.clone().normalize();
      const latitude = THREE.MathUtils.radToDeg(Math.asin(normal.y));
      const thetaDeg = THREE.MathUtils.radToDeg(
        Math.atan2(normal.z, -normal.x),
      );
      const longitude = THREE.MathUtils.euclideanModulo(thetaDeg, 360) - 180;
      onGlobeSurfacePress({ latitude, longitude });
    },
    [controls.functions, onGlobeSurfacePress],
  );

  const flightRef = useRef<CameraFlight | null>(null);
  const cameraDistanceRef = useRef(DEFAULT_CAMERA_DISTANCE);
  const onCameraViewChangeRef = useRef(onCameraViewChange);
  onCameraViewChangeRef.current = onCameraViewChange;
  const lastCameraViewKeyRef = useRef("");

  const emitCameraView = useCallback(() => {
    const distance = camera.position.length();
    const [centerLat, centerLng] = vector3ToLatLng(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
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
  }, [camera]);

  const [visibleCirclePinNames, setVisibleCirclePinNames] = useState<
    Set<string>
  >(() => new Set());

  const handlePinPositions = useCallback(
    (positions: GlobePinScreenPosition[]) => {
      if (!showGlobePins) return;

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
    [showGlobePins],
  );

  const focusLatLng = useCallback(
    (lat: number, lng: number, duration = 650, targetDistance?: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const toDir = new THREE.Vector3(
        ...latLngToVector3(lat, lng, 1),
      ).normalize();
      const fromDir = camera.position.clone().normalize();
      const fromDistance = cameraDistanceRef.current;
      const toDistance = targetDistance ?? fromDistance;

      flightRef.current = {
        fromDir,
        toDir,
        fromDistance,
        toDistance,
        elapsed: 0,
        duration: duration / 1000,
      };
    },
    [camera],
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
    const toDir = new THREE.Vector3(...INITIAL_CAMERA_POSITION).normalize();
    flightRef.current = {
      fromDir: camera.position.clone().normalize(),
      toDir,
      fromDistance: cameraDistanceRef.current,
      toDistance: DEFAULT_CAMERA_DISTANCE,
      elapsed: 0,
      duration: 0.55,
    };
    cameraDistanceRef.current = DEFAULT_CAMERA_DISTANCE;
    controls.scope.target.set(0, GLOBE_VIEW_TARGET_Y, 0);
    camera.lookAt(controls.scope.target);
  }, [camera, controls.scope.target]);

  const zoomBy = useCallback(
    (direction: "in" | "out") => {
      flightRef.current = null;

      const scale = direction === "in" ? 0.82 : 1.22;
      const nextDistance = THREE.MathUtils.clamp(
        cameraDistanceRef.current * scale,
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      );
      cameraDistanceRef.current = nextDistance;

      const directionVector = camera.position.clone().normalize();
      camera.position.copy(directionVector.multiplyScalar(nextDistance));
    },
    [camera],
  );

  useEffect(() => {
    if (!flightRef.current) {
      controls.scope.enabled = !lockUserGestures;
    }
  }, [controls.scope, lockUserGestures]);

  useEffect(() => {
    controls.scope.camera = camera as THREE.PerspectiveCamera;
    controls.scope.target.set(0, GLOBE_VIEW_TARGET_Y, 0);
    camera.lookAt(controls.scope.target);
    controls.scope.enablePan = false;
    controls.scope.dampingFactor = 0.05;
    controls.scope.rotateSpeed = 0.9;
    controls.scope.zoomSpeed = 0.5;
    controls.scope.minZoom = MIN_CAMERA_DISTANCE;
    controls.scope.maxZoom = MAX_CAMERA_DISTANCE;
    controls.scope.onChange = () => {
      const distance = camera.position.length();
      cameraDistanceRef.current = distance;
      emitCameraView();
    };
    controls.scope.onStart = () => {
      flightRef.current = null;
    };
  }, [camera, controls.scope, emitCameraView]);

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
    const flight = flightRef.current;

    if (flight) {
      controls.scope.enabled = false;
      flight.elapsed += delta;
      const progress = Math.min(flight.elapsed / flight.duration, 1);
      const eased = easeInOutCubic(progress);

      // Slerp direction at fixed radius — linear lerp dips toward the globe center
      // and reads as zoom-in/out while panning.
      slerpUnitVectors(flight.fromDir, flight.toDir, eased, slerpScratchDir);
      const distance = THREE.MathUtils.lerp(
        flight.fromDistance,
        flight.toDistance,
        eased,
      );
      cameraDistanceRef.current = distance;
      camera.position.copy(slerpScratchDir.multiplyScalar(distance));
      camera.lookAt(controls.scope.target);

      if (progress >= 1) {
        flightRef.current = null;
        cameraDistanceRef.current = flight.toDistance;
        controls.scope.enabled = !lockUserGestures;
        controls.functions.update();
        emitCameraView();
      }
      return;
    }

    controls.scope.enabled = !lockUserGestures;
    controls.functions.update();

    const distance = camera.position.length();
    if (Math.abs(distance - cameraDistanceRef.current) > 0.01) {
      cameraDistanceRef.current = distance;
      emitCameraView();
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
        // onClick={handleGlobeSurfacePress}
        onPointerDown={handleGlobeSurfacePress}
      >
        <sphereGeometry args={[GLOBE_RADIUS * 1.01, 64, 64]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <GlobeBoundaryLines
        boundaryCountries={boundaryCountries}
        selectedName={selectedName}
        focusedRegion={focusedRegion}
      />

      <GlobeCoordinateProjector
        layoutSize={layoutSize}
        onReady={onProjectorReady}
      />

      <GlobeLabelProjector
        labels={visibleLabels}
        onPositions={onLabelPositions}
      />

      {showGlobePins ? (
        <GlobePinProjector
          countries={countries}
          onPositions={handlePinPositions}
        />
      ) : null}

      {showGlobePins
        ? countries.map((country) => {
            if (!isValidLatLng(country.latlng)) return null;
            const isSelected = selectedName === country.name;
            const isFocusTransitioning = focusTransitionName === country.name;
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
                  continentSinglePinActive &&
                  !isSelected &&
                  !isFocusTransitioning
                }
                onPress={handlePinPress}
              />
            );
          })
        : null}
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
  countryMarkerMode?: CountryMarkerDisplayMode;
  onClusterPress: (cluster: MapCluster) => void;
  onCountryPress: (country: MapCountry) => void;
  onBackgroundPress: (coordinate?: MapPressCoordinate) => void;
  onCanvasPainted?: () => void;
  onCameraViewChange?: (state: GlobeCameraViewState) => void;
  lockUserGestures?: boolean;
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
      countryMarkerMode = "flag",
      onClusterPress,
      onCountryPress,
      onBackgroundPress,
      onCanvasPainted,
      onCameraViewChange,
      lockUserGestures = false,
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
    const showGlobePins =
      !!focusedRegion &&
      isGlobeYellowPinsVisible(countryMarkerMode) &&
      countries.length > 0;

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
            showGlobePins={showGlobePins}
            onCountryPress={onCountryPress}
            controls={controls}
            onReady={handleReady}
            onCanvasPainted={onCanvasPainted}
            onLabelPositions={handleLabelPositions}
            onCameraViewChange={onCameraViewChange}
            onGlobeSurfacePress={handleGlobeSurfacePress}
            layoutSize={layoutSize}
            onProjectorReady={handleProjectorReady}
            lockUserGestures={lockUserGestures}
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
