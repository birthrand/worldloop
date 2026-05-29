import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { Region } from "react-native-maps";

import {
  GlobeView,
  type GlobeCameraViewState,
  type GlobeViewHandle,
} from "@/components/map/globe-view";
import { MapTapRipple } from "@/components/map/map-tap-ripple";
import {
  WorldMapView,
  type MapZoomTier,
  type WorldMapViewHandle,
} from "@/components/map/world-map-view";
import type { MapCluster } from "@/lib/map-clusters";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";
import {
  MAP_CONTINENT_FOCUS_FADE_MS,
  MAP_SCRIM_MAX_OPACITY,
} from "@/constants/map-continent-focus";
import {
  GLOBE_CROSSFADE_MS,
  MAP_DIM_HOLD_MS,
  type MapViewTransition,
  shouldShowFlatMapMarkers,
  shouldShowGlobeLayer,
} from "@/lib/map-view-transition";
import type { MapMarkerPresentation } from "@/lib/map-region-markers";
import { useMapStore } from "@/store/use-map-store";
import type { CountryMarkerDisplayMode } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

export type MapCanvasHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  resetWorldView: () => void;
  zoomBy: (direction: "in" | "out") => void;
  focusCountryOnGlobe: (country: MapCountry, duration?: number) => void;
};

type MapCanvasProps = {
  countries: MapCountry[];
  boundaryCountries: MapCountry[];
  clusters: MapCluster[];
  selectedName: string | null;
  focusTransitionName?: string | null;
  focusedRegion: string | null;
  previewRegion?: string | null;
  tapRippleAt?: MapPressCoordinate | null;
  tapRippleToken?: number;
  zoomTier: MapZoomTier;
  countryMarkerMode?: CountryMarkerDisplayMode;
  markerPresentation?: MapMarkerPresentation;
  markerRevealGeneration?: number;
  mapViewTransition: MapViewTransition;
  onGlobeTransitionComplete: () => void;
  onFlatTransitionComplete: () => void;
  onGlobeCameraViewChange?: (state: GlobeCameraViewState) => void;
  onCountryPress: (country: MapCountry) => void;
  onClusterPress: (cluster: MapCluster) => void;
  onMapPress: (coordinate?: MapPressCoordinate) => void;
  onRegionChangeComplete?: (region: Region) => void;
  lockUserGestures?: boolean;
  /** Keeps map markers updating while the camera animates (e.g. Explore → Map). */
  suspendMarkerSnapshot?: boolean;
  markerRefreshToken?: number;
};

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      countries,
      boundaryCountries,
      clusters,
      selectedName,
      focusTransitionName = null,
      focusedRegion,
      previewRegion = null,
      tapRippleAt = null,
      tapRippleToken = 0,
      zoomTier,
      countryMarkerMode = "flag",
      markerPresentation = "full",
      markerRevealGeneration = 0,
      mapViewTransition,
      onGlobeTransitionComplete,
      onFlatTransitionComplete,
      onGlobeCameraViewChange,
      onCountryPress,
      onClusterPress,
      onMapPress,
      onRegionChangeComplete,
      lockUserGestures = false,
      suspendMarkerSnapshot = false,
      markerRefreshToken = 0,
    },
    ref,
  ) {
    const mapMode = useMapStore((s) => s.mapMode);
    const mapRef = useRef<WorldMapViewHandle>(null);
    const globeRef = useRef<GlobeViewHandle>(null);
    const [rippleScreen, setRippleScreen] = useState<{
      x: number;
      y: number;
    } | null>(null);

    const globeOpacity = useSharedValue(shouldShowGlobeLayer(mapMode, mapViewTransition) ? 1 : 0);
    const flatDimOpacity = useSharedValue(0);
    const continentFocusBlend = useSharedValue(focusedRegion ? 1 : 0);

    const globePaintedRef = useRef(false);
    const enteringGlobeStartedRef = useRef(false);
    const enteringFlatStartedRef = useRef(false);

    const showGlobe = shouldShowGlobeLayer(mapMode, mapViewTransition);
    const isGlobeInteractive =
      mapMode === "3d" && mapViewTransition === "ready";
    const showFlatMarkers = shouldShowFlatMapMarkers(mapMode);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion: (region, duration) =>
          mapRef.current?.animateToRegion(region, duration),
        resetWorldView: () => {
          if (mapMode === "3d") {
            globeRef.current?.resetCamera();
            return;
          }
          mapRef.current?.resetWorldView();
        },
        zoomBy: (direction) => {
          if (mapMode === "3d") {
            globeRef.current?.zoomBy(direction);
            return;
          }
          mapRef.current?.zoomBy(direction);
        },
        focusCountryOnGlobe: (country, duration) =>
          globeRef.current?.focusCountry(country, duration),
      }),
      [mapMode],
    );

    const finishGlobeEnter = useCallback(() => {
      onGlobeTransitionComplete();
    }, [onGlobeTransitionComplete]);

    const finishFlatEnter = useCallback(() => {
      onFlatTransitionComplete();
    }, [onFlatTransitionComplete]);

    const startGlobeFadeIn = useCallback(() => {
      flatDimOpacity.value = withDelay(
        MAP_DIM_HOLD_MS,
        withTiming(0, { duration: GLOBE_CROSSFADE_MS }),
      );
      globeOpacity.value = withDelay(
        MAP_DIM_HOLD_MS,
        withTiming(1, { duration: GLOBE_CROSSFADE_MS }, (finished) => {
          if (finished) {
            runOnJS(finishGlobeEnter)();
          }
        }),
      );
    }, [finishGlobeEnter, flatDimOpacity, globeOpacity]);

    const handleGlobePainted = useCallback(() => {
      if (mapViewTransition !== "enteringGlobe" || globePaintedRef.current) {
        return;
      }
      globePaintedRef.current = true;
      startGlobeFadeIn();
    }, [mapViewTransition, startGlobeFadeIn]);

    useEffect(() => {
      if (mapViewTransition !== "enteringGlobe") {
        enteringGlobeStartedRef.current = false;
        globePaintedRef.current = false;
        return;
      }
      if (enteringGlobeStartedRef.current) return;
      enteringGlobeStartedRef.current = true;

      globeOpacity.value = 0;
      flatDimOpacity.value = withTiming(0.45, { duration: MAP_DIM_HOLD_MS });

      const fallback = setTimeout(() => {
        if (globePaintedRef.current) return;
        globePaintedRef.current = true;
        startGlobeFadeIn();
      }, 2500);

      return () => clearTimeout(fallback);
    }, [flatDimOpacity, globeOpacity, mapViewTransition, startGlobeFadeIn]);

    const startFlatFadeIn = useCallback(() => {
      flatDimOpacity.value = withSequence(
        withTiming(0.45, { duration: MAP_DIM_HOLD_MS }),
        withTiming(0, { duration: GLOBE_CROSSFADE_MS }),
      );
      globeOpacity.value = withDelay(
        MAP_DIM_HOLD_MS,
        withTiming(0, { duration: GLOBE_CROSSFADE_MS }, (finished) => {
          if (finished) {
            runOnJS(finishFlatEnter)();
          }
        }),
      );
    }, [finishFlatEnter, flatDimOpacity, globeOpacity]);

    useEffect(() => {
      if (mapViewTransition !== "enteringFlat") {
        enteringFlatStartedRef.current = false;
        return;
      }
      if (enteringFlatStartedRef.current) return;
      enteringFlatStartedRef.current = true;

      globeOpacity.value = 1;
      flatDimOpacity.value = 0;
      startFlatFadeIn();
    }, [flatDimOpacity, globeOpacity, mapViewTransition, startFlatFadeIn]);

    useEffect(() => {
      if (mapViewTransition === "ready" && mapMode === "3d") {
        globeOpacity.value = 1;
        flatDimOpacity.value = 0;
      }
      if (mapViewTransition === "idle" && mapMode === "2d") {
        globeOpacity.value = 0;
        flatDimOpacity.value = 0;
      }
    }, [flatDimOpacity, globeOpacity, mapMode, mapViewTransition]);

    const globeLayerStyle = useAnimatedStyle(() => ({
      opacity: globeOpacity.value,
    }));

    const flatDimStyle = useAnimatedStyle(() => ({
      opacity: flatDimOpacity.value,
    }));

    useEffect(() => {
      continentFocusBlend.value = withTiming(focusedRegion ? 1 : 0, {
        duration: MAP_CONTINENT_FOCUS_FADE_MS,
        easing: Easing.inOut(Easing.ease),
      });
    }, [continentFocusBlend, focusedRegion]);

    const continentFocusScrimStyle = useAnimatedStyle(() => ({
      opacity: continentFocusBlend.value * MAP_SCRIM_MAX_OPACITY,
    }));

    useEffect(() => {
      if (!tapRippleAt) {
        setRippleScreen(null);
        return;
      }

      let cancelled = false;

      const resolveRipple = async () => {
        if (mapMode === "3d" && mapViewTransition === "ready") {
          const projected = globeRef.current?.projectLatLng(
            tapRippleAt.latitude,
            tapRippleAt.longitude,
          );
          if (!cancelled && projected?.visible) {
            setRippleScreen({ x: projected.x, y: projected.y });
          }
          return;
        }

        if (mapMode === "2d") {
          const point = await mapRef.current?.pointForCoordinate(tapRippleAt);
          if (!cancelled && point) {
            setRippleScreen(point);
          }
        }
      };

      void resolveRipple();

      return () => {
        cancelled = true;
      };
    }, [mapMode, mapViewTransition, tapRippleAt, tapRippleToken]);

    const mapProps = {
      countries,
      boundaryCountries,
      selectedName,
      focusTransitionName,
      focusedRegion,
      previewRegion,
      zoomTier,
      countryMarkerMode: showFlatMarkers ? countryMarkerMode : "hidden",
      markerPresentation,
      markerRevealGeneration,
      onCountryPress,
      onMapPress,
      onRegionChangeComplete,
      lockUserGestures,
      suspendMarkerSnapshot,
      markerRefreshToken,
    };

    return (
      <View style={styles.root}>
        <View
          style={styles.layer}
          pointerEvents={isGlobeInteractive ? "none" : "auto"}
        >
          <WorldMapView
            ref={mapRef}
            {...mapProps}
            countries={showFlatMarkers ? countries : []}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.flatDim, flatDimStyle]}
          />
        </View>

        {showGlobe ? (
          <Animated.View
            style={[styles.layer, globeLayerStyle]}
            pointerEvents={isGlobeInteractive ? "auto" : "none"}
          >
            <GlobeView
              ref={globeRef}
              countries={countries}
              clusters={[]}
              labelClusters={clusters}
              boundaryCountries={boundaryCountries}
              selectedName={selectedName}
              focusTransitionName={focusTransitionName}
              focusedRegion={focusedRegion}
              countryMarkerMode={countryMarkerMode}
              onClusterPress={onClusterPress}
              onCountryPress={onCountryPress}
              onBackgroundPress={onMapPress}
              onCanvasPainted={handleGlobePainted}
              onCameraViewChange={onGlobeCameraViewChange}
              lockUserGestures={lockUserGestures || !isGlobeInteractive}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.continentFocusScrim, continentFocusScrimStyle]}
            />
          </Animated.View>
        ) : null}

        {rippleScreen ? (
          <MapTapRipple
            x={rippleScreen.x}
            y={rippleScreen.y}
            triggerKey={tapRippleToken}
          />
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b132b",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  flatDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b132b",
  },
  continentFocusScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b132b",
  },
});
