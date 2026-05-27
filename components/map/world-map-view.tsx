import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { PROVIDER_DEFAULT, type Region } from "react-native-maps";

import { MAP_DARK_STYLE } from "@/constants/map-dark-style";
import { WORLD_INITIAL_REGION } from "@/constants/map-regions";
import { MapCountryMarker } from "@/components/map/map-country-marker";
import { MapPulseClusterMarker } from "@/components/map/map-pulse-cluster-marker";
import type { MapCluster } from "@/lib/map-clusters";
import type { MapCountry } from "@/types/country";

export type WorldMapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  resetWorldView: () => void;
  zoomBy: (direction: "in" | "out") => void;
};

export type MapZoomTier = "world" | "region" | "country";

type WorldMapViewProps = {
  countries: MapCountry[];
  clusters: MapCluster[];
  selectedName: string | null;
  focusedRegion: string | null;
  zoomTier: MapZoomTier;
  onCountryPress: (country: MapCountry) => void;
  onClusterPress: (cluster: MapCluster) => void;
  onMapPress: () => void;
  onRegionChangeComplete?: (region: Region) => void;
};

export const WorldMapView = forwardRef<WorldMapViewHandle, WorldMapViewProps>(
  function WorldMapView(
    {
      countries,
      clusters,
      selectedName,
      focusedRegion,
      zoomTier,
      onCountryPress,
      onClusterPress,
      onMapPress,
      onRegionChangeComplete,
    },
    ref,
  ) {
    const mapRef = useRef<MapView>(null);
    const regionRef = useRef<Region>(WORLD_INITIAL_REGION);

    const animateToRegion = useCallback((region: Region, duration = 500) => {
      regionRef.current = region;
      mapRef.current?.animateToRegion(region, duration);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion,
        resetWorldView: () => animateToRegion(WORLD_INITIAL_REGION),
        zoomBy: (direction) => {
          const current = regionRef.current;
          const scale = direction === "in" ? 0.65 : 1.45;
          const next: Region = {
            ...current,
            latitudeDelta: Math.min(
              120,
              Math.max(2, current.latitudeDelta * scale),
            ),
            longitudeDelta: Math.min(
              120,
              Math.max(2, current.longitudeDelta * scale),
            ),
          };
          animateToRegion(next, 300);
        },
      }),
      [animateToRegion],
    );

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={WORLD_INITIAL_REGION}
        customMapStyle={MAP_DARK_STYLE}
        onPress={onMapPress}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
          onRegionChangeComplete?.(region);
        }}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsScale={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType={Platform.OS === "android" ? "standard" : "mutedStandard"}
      >
        {zoomTier === "world"
          ? clusters.map((cluster) => (
              <MapPulseClusterMarker
                key={cluster.id}
                cluster={cluster}
                selected={focusedRegion === cluster.region}
                onPress={onClusterPress}
              />
            ))
          : countries.map((country) => (
              <MapCountryMarker
                key={country.name}
                country={country}
                selected={selectedName === country.name}
                onPress={() => onCountryPress(country)}
              />
            ))}
      </MapView>
    );
  },
);

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
