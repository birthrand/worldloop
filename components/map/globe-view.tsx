import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

import { GlobeCountryPin } from "@/components/map/globe-country-pin";
import {
  createGlobeOrbitControls,
  type GlobeOrbitControls,
} from "@/lib/globe-orbit-controls";
import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import { useGlobeTexture } from "@/lib/load-globe-texture";
import { isValidLatLng } from "@/lib/map-country";
import { useMapStore, type GlobeCameraHandle } from "@/store/use-map-store";
import type { MapCountry } from "@/types/country";

// Some Three.js RN helpers expect THREE on globalThis.
const globalWithThree = globalThis as typeof globalThis & {
  THREE?: typeof THREE;
};
globalWithThree.THREE = globalWithThree.THREE ?? THREE;

const GLOBE_RADIUS = 1;
const PIN_RADIUS = GLOBE_RADIUS * 1.02;
const DEFAULT_CAMERA_DISTANCE = 2.5;
const MIN_CAMERA_DISTANCE = 1.4;
const MAX_CAMERA_DISTANCE = 4;

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

type GlobeSceneProps = {
  countries: MapCountry[];
  controls: GlobeOrbitControls;
  onReady: (handle: GlobeCameraHandle) => void;
};

function GlobeScene({ countries, controls, onReady }: GlobeSceneProps) {
  const texture = useGlobeTexture();
  const { camera } = useThree();

  const flightRef = useRef<CameraFlight | null>(null);
  const cameraDistanceRef = useRef(DEFAULT_CAMERA_DISTANCE);

  const focusCountry = useCallback(
    (country: MapCountry, duration = 650) => {
      if (!isValidLatLng(country.latlng)) return;

      const [lat, lng] = country.latlng;
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
    controls.scope.camera = camera as THREE.PerspectiveCamera;
    controls.scope.enablePan = false;
    controls.scope.dampingFactor = 0.05;
    controls.scope.rotateSpeed = 0.65;
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
      resetCamera,
      zoomBy,
    };
    onReady(handle);
    useMapStore.getState().registerGlobeCamera(handle);
    return () => useMapStore.getState().registerGlobeCamera(null);
  }, [focusCountry, onReady, resetCamera, zoomBy]);

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
        controls.scope.enabled = true;
      }
      return;
    }

    controls.scope.enabled = true;
    controls.functions.update();
  });

  return (
    <>
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

      {countries.map((country) => {
        if (!isValidLatLng(country.latlng)) return null;
        const [lat, lng] = country.latlng;
        return (
          <GlobeCountryPin
            key={country.name}
            country={country}
            position={latLngToVector3(lat, lng, PIN_RADIUS)}
          />
        );
      })}
    </>
  );
}

export type GlobeViewHandle = GlobeCameraHandle;

type GlobeViewProps = {
  countries: MapCountry[];
  onBackgroundPress: () => void;
};

export const GlobeView = forwardRef<GlobeViewHandle, GlobeViewProps>(
  function GlobeView({ countries, onBackgroundPress }, ref) {
    const handleRef = useRef<GlobeCameraHandle | null>(null);
    const controls = useMemo(() => createGlobeOrbitControls(), []);

    useImperativeHandle(
      ref,
      () => ({
        focusCountry: (country, duration) =>
          handleRef.current?.focusCountry(country, duration),
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
            controls={controls}
            onReady={handleReady}
          />
        </Canvas>
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
