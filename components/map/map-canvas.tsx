import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { Region } from "react-native-maps";

import { GlobeView, type GlobeViewHandle } from "@/components/map/globe-view";
import {
  WorldMapView,
  type MapZoomTier,
  type WorldMapViewHandle,
} from "@/components/map/world-map-view";
import type { MapCluster } from "@/lib/map-clusters";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";
import {
  GLOBE_CROSSFADE_MS,
  MAP_DIM_HOLD_MS,
  type MapViewTransition,
  shouldShowFlatMapMarkers,
  shouldShowGlobeLayer,
} from "@/lib/map-view-transition";
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
  focusedRegion: string | null;
  zoomTier: MapZoomTier;
  countryMarkerMode?: CountryMarkerDisplayMode;
  mapViewTransition: MapViewTransition;
  onGlobeTransitionComplete: () => void;
  onFlatTransitionComplete: () => void;
  onCountryPress: (country: MapCountry) => void;
  onClusterPress: (cluster: MapCluster) => void;
  onMapPress: (coordinate?: MapPressCoordinate) => void;
  onRegionChangeComplete?: (region: Region) => void;
  lockUserGestures?: boolean;
};

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      countries,
      boundaryCountries,
      clusters,
      selectedName,
      focusedRegion,
      zoomTier,
      countryMarkerMode = "flag",
      mapViewTransition,
      onGlobeTransitionComplete,
      onFlatTransitionComplete,
      onCountryPress,
      onClusterPress,
      onMapPress,
      onRegionChangeComplete,
      lockUserGestures = false,
    },
    ref,
  ) {
    const mapMode = useMapStore((s) => s.mapMode);
    const mapRef = useRef<WorldMapViewHandle>(null);
    const globeRef = useRef<GlobeViewHandle>(null);

    const globeOpacity = useSharedValue(shouldShowGlobeLayer(mapMode, mapViewTransition) ? 1 : 0);
    const flatDimOpacity = useSharedValue(0);

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

    useEffect(() => {
      if (mapViewTransition !== "enteringFlat") {
        enteringFlatStartedRef.current = false;
        return;
      }
      if (enteringFlatStartedRef.current) return;
      enteringFlatStartedRef.current = true;

      flatDimOpacity.value = 0;
      globeOpacity.value = withTiming(
        0,
        { duration: GLOBE_CROSSFADE_MS },
        (finished) => {
          if (finished) {
            runOnJS(finishFlatEnter)();
          }
        },
      );
    }, [finishFlatEnter, flatDimOpacity, globeOpacity, mapViewTransition]);

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

    const mapProps = {
      countries,
      boundaryCountries,
      clusters,
      selectedName,
      focusedRegion,
      zoomTier,
      countryMarkerMode: showFlatMarkers ? countryMarkerMode : "hidden",
      onCountryPress,
      onClusterPress,
      onMapPress,
      onRegionChangeComplete,
      lockUserGestures,
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
            clusters={showFlatMarkers ? clusters : []}
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
              clusters={!focusedRegion ? clusters : []}
              labelClusters={clusters}
              boundaryCountries={boundaryCountries}
              selectedName={selectedName}
              focusedRegion={focusedRegion}
              countryMarkerMode={countryMarkerMode}
              onCountryPress={onCountryPress}
              onClusterPress={onClusterPress}
              onBackgroundPress={onMapPress}
              onCanvasPainted={handleGlobePainted}
              lockUserGestures={lockUserGestures || !isGlobeInteractive}
            />
          </Animated.View>
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
});
