import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, {
  Polygon,
  PROVIDER_DEFAULT,
  type Region,
} from "react-native-maps";

import { MapCountryMarker } from "@/components/map/map-country-marker";
import { MapPulseClusterMarker } from "@/components/map/map-pulse-cluster-marker";
import {
  boundaryStyleRenderKey,
  resolveBoundaryFillColor,
  resolveBoundaryStrokeColor,
  resolveBoundaryStrokeWidth,
} from "@/constants/map-boundary-style";
import { MAP_DARK_STYLE } from "@/constants/map-dark-style";
import { WORLD_INITIAL_REGION } from "@/constants/map-regions";
import type { MapCluster } from "@/lib/map-clusters";
import {
  filterBoundaryPolygonsByMapContext,
  parseCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

export type WorldMapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  resetWorldView: () => void;
  zoomBy: (direction: "in" | "out") => void;
};

export type MapZoomTier = "world" | "region" | "country";

type WorldMapViewProps = {
  countries: MapCountry[];
  /** Full country list for boundary region matching (markers may be a subset). */
  boundaryCountries: MapCountry[];
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
      boundaryCountries,
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

    const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);

    const allCountryBoundaries = useMemo(
      () => parseCountryBoundaryPolygons(countriesGeoJson),
      [],
    );

    const countryBoundaries = useMemo(
      () =>
        filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
          selectedCountryName: selectedName,
          focusedRegion,
          countries: boundaryCountries,
        }),
      [
        allCountryBoundaries,
        boundaryCountries,
        focusedRegion,
        selectedName,
      ],
    );

    const outlineStrokeWidth = resolveBoundaryStrokeWidth(
      boundaryStyle,
      zoomTier,
    );
    const outlineStrokeColor = resolveBoundaryStrokeColor(
      boundaryStyle,
      zoomTier,
    );
    const outlineFillColor = resolveBoundaryFillColor(boundaryStyle);
    const boundaryRenderKey = boundaryStyleRenderKey(boundaryStyle, zoomTier);

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
        mapType={Platform.OS === "android" ? "standard" : "hybridFlyover"}
      >
        {countryBoundaries.map((polygon) => (
          <Polygon
            key={`${polygon.id}-${boundaryRenderKey}`}
            coordinates={polygon.coordinates}
            holes={polygon.holes}
            tappable={false}
            strokeColor={outlineStrokeColor}
            strokeWidth={outlineStrokeWidth}
            fillColor={outlineFillColor}
            zIndex={1}
          />
        ))}
        {focusedRegion || countries.length > 0
          ? countries.map((country) => (
              <MapCountryMarker
                key={country.name}
                country={country}
                selected={selectedName === country.name}
                onPress={() => onCountryPress(country)}
              />
            ))
          : clusters.map((cluster) => (
              <MapPulseClusterMarker
                key={cluster.id}
                cluster={cluster}
                selected={focusedRegion === cluster.region}
                onPress={onClusterPress}
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
