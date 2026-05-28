import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
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
  createGlobeOrbitControls,
  type GlobeOrbitControls,
} from "@/lib/globe-orbit-controls";
import {
  buildGlobeVisibleLabels,
  globeLabelPositionsChanged,
  type GlobeLabelScreenPosition,
} from "@/lib/globe-labels";
import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import { useGlobeTexture } from "@/lib/load-globe-texture";
import type { MapCluster } from "@/lib/map-clusters";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";
import { useMapStore, type GlobeCameraHandle } from "@/store/use-map-store";
import type { CountryMarkerDisplayMode } from "@/store/use-map-ui-store";
import { isGlobeYellowPinsVisible } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

// Some Three.js RN helpers expect THREE on globalThis.
const globalWithThree = globalThis as typeof globalThis & {
  THREE?: typeof THREE;
};
globalWithThree.THREE = globalWithThree.THREE ?? THREE;

const GLOBE_RADIUS = 1;
const PIN_RADIUS = GLOBE_RADIUS * 1.02;
const MIN_CAMERA_DISTANCE = 1.4;
const MAX_CAMERA_DISTANCE = 4;
/** World view starts fully zoomed out (same as reset / zoom-out limit). */
const DEFAULT_CAMERA_DISTANCE = MAX_CAMERA_DISTANCE;

/** Camera sits on the Atlantic side so Americas + Europe/Africa pins are visible first. */
const INITIAL_CAMERA_POSITION = latLngToVector3(
  0,
  -30,
  DEFAULT_CAMERA_DISTANCE,
);

type CameraFlight = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  elapsed: number;
  duration: number;
};

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

type GlobeSceneProps = {
  countries: MapCountry[];
  visibleLabels: ReturnType<typeof buildGlobeVisibleLabels>;
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusedRegion: string | null;
  countryMarkerMode: CountryMarkerDisplayMode;
  controls: GlobeOrbitControls;
  onReady: (handle: GlobeCameraHandle) => void;
  onCanvasPainted?: () => void;
  onLabelPositions: (positions: GlobeLabelScreenPosition[]) => void;
  onGlobeSurfacePress: (coordinate: MapPressCoordinate) => void;
  lockUserGestures: boolean;
};

function GlobeScene({
  countries,
  visibleLabels,
  boundaryCountries,
  selectedName,
  focusedRegion,
  countryMarkerMode,
  controls,
  onReady,
  onCanvasPainted,
  onLabelPositions,
  onGlobeSurfacePress,
  lockUserGestures,
}: GlobeSceneProps) {
  const texture = useGlobeTexture();
  const { camera } = useThree();
  const selectCountry = useMapStore((s) => s.selectCountry);
  const focusCountryOnGlobe = useMapStore((s) => s.focusCountryOnGlobe);
  const highlightedName = selectedName;

  const handlePinPress = useCallback(
    (country: MapCountry) => {
      selectCountry(country.name);
      focusCountryOnGlobe(country.name, 450);
    },
    [focusCountryOnGlobe, selectCountry],
  );

  const handleGlobeSurfacePress = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const normal = event.point.clone().normalize();
      const latitude = THREE.MathUtils.radToDeg(Math.asin(normal.y));
      const thetaDeg = THREE.MathUtils.radToDeg(Math.atan2(normal.z, -normal.x));
      const longitude = THREE.MathUtils.euclideanModulo(
        thetaDeg,
        360,
      ) - 180;
      onGlobeSurfacePress({ latitude, longitude });
    },
    [onGlobeSurfacePress],
  );

  const showYellowPins = isGlobeYellowPinsVisible(countryMarkerMode);

  const flightRef = useRef<CameraFlight | null>(null);
  const cameraDistanceRef = useRef(DEFAULT_CAMERA_DISTANCE);

  const focusLatLng = useCallback(
    (lat: number, lng: number, duration = 650) => {
      const direction = new THREE.Vector3(
        ...latLngToVector3(lat, lng, 1),
      ).normalize();
      const targetPosition = direction.multiplyScalar(
        cameraDistanceRef.current,
      );

      flightRef.current = {
        from: camera.position.clone(),
        to: targetPosition,
        elapsed: 0,
        duration: duration / 1000,
      };
    },
    [camera],
  );

  const focusCountry = useCallback(
    (country: MapCountry, duration = 650) => {
      if (!isValidLatLng(country.latlng)) return;
      const [lat, lng] = getMapDisplayLatLng(country);
      focusLatLng(lat, lng, duration);
    },
    [focusLatLng],
  );

  const resetCamera = useCallback(() => {
    flightRef.current = {
      from: camera.position.clone(),
      to: new THREE.Vector3(...INITIAL_CAMERA_POSITION),
      elapsed: 0,
      duration: 0.55,
    };
    cameraDistanceRef.current = DEFAULT_CAMERA_DISTANCE;
    controls.scope.target.set(0, 0, 0);
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
    controls.scope.enablePan = false;
    controls.scope.dampingFactor = 0.05;
    controls.scope.rotateSpeed = 0.9;
    controls.scope.zoomSpeed = 0.5;
    controls.scope.minZoom = MIN_CAMERA_DISTANCE;
    controls.scope.maxZoom = MAX_CAMERA_DISTANCE;
    controls.scope.onChange = () => {
      cameraDistanceRef.current = camera.position.length();
    };
    controls.scope.onStart = () => {
      flightRef.current = null;
    };
  }, [camera, controls.scope]);

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
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(flight.from, flight.to, eased);
      camera.lookAt(controls.scope.target);
      controls.functions.update();

      if (progress >= 1) {
        flightRef.current = null;
        controls.scope.enabled = !lockUserGestures;
      }
      return;
    }

    controls.scope.enabled = !lockUserGestures;
    controls.functions.update();
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
        onClick={handleGlobeSurfacePress}
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

      <GlobeLabelProjector
        labels={visibleLabels}
        onPositions={onLabelPositions}
      />

      {showYellowPins
        ? countries.map((country) => {
            if (!isValidLatLng(country.latlng)) return null;
            const [lat, lng] = getMapDisplayLatLng(country);
            return (
              <GlobeCountryPin
                key={country.name}
                country={country}
                position={latLngToVector3(lat, lng, PIN_RADIUS)}
                isSelected={highlightedName === country.name}
                onPress={handlePinPress}
              />
            );
          })
        : null}
    </>
  );
}

export type GlobeViewHandle = GlobeCameraHandle;

type GlobeViewProps = {
  countries: MapCountry[];
  clusters: MapCluster[];
  /** Full continent clusters — used for label anchors even when region pins are hidden. */
  labelClusters: MapCluster[];
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusedRegion: string | null;
  countryMarkerMode?: CountryMarkerDisplayMode;
  onCountryPress: (country: MapCountry) => void;
  onClusterPress: (cluster: MapCluster) => void;
  onBackgroundPress: (coordinate?: MapPressCoordinate) => void;
  onCanvasPainted?: () => void;
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
      focusedRegion,
      countryMarkerMode = "flag",
      onCountryPress,
      onClusterPress,
      onBackgroundPress,
      onCanvasPainted,
      lockUserGestures = false,
    },
    ref,
  ) {
    const handleRef = useRef<GlobeCameraHandle | null>(null);
    const controls = useMemo(() => createGlobeOrbitControls(), []);
    const [labelPositions, setLabelPositions] = useState<
      GlobeLabelScreenPosition[]
    >([]);

    const selectedCountry = useMemo(
      () =>
        selectedName
          ? (countries.find((country) => country.name === selectedName) ??
            null)
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
        focusLatLng: (lat, lng, duration) =>
          handleRef.current?.focusLatLng(lat, lng, duration),
        resetCamera: () => handleRef.current?.resetCamera(),
        zoomBy: (direction) => handleRef.current?.zoomBy(direction),
      }),
      [],
    );

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

    return (
      <View style={styles.container} {...controls.events}>
        <Canvas
          style={styles.canvas}
          camera={{
            position: INITIAL_CAMERA_POSITION,
            fov: 50,
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
            focusedRegion={focusedRegion}
            countryMarkerMode={countryMarkerMode}
            controls={controls}
            onReady={handleReady}
            onCanvasPainted={onCanvasPainted}
            onLabelPositions={handleLabelPositions}
            onGlobeSurfacePress={handleGlobeSurfacePress}
            lockUserGestures={lockUserGestures}
          />
        </Canvas>

        <GlobeLabelOverlay
          labels={visibleLabels}
          positions={labelPositions}
          continentClustersByRegion={continentClustersByRegion}
          onContinentPress={onClusterPress}
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
