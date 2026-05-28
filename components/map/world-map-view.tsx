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

import { MapContinentFocusLayers } from "@/components/map/map-continent-focus-layers";
import { MapCountryMarker } from "@/components/map/map-country-marker";
import {
  boundaryStyleRenderKey,
  resolveBoundaryFillColor,
  resolveBoundaryStrokeColor,
  resolveBoundaryStrokeWidth,
} from "@/constants/map-boundary-style";
import { MAP_DARK_STYLE } from "@/constants/map-dark-style";
import { WORLD_INITIAL_REGION } from "@/constants/map-regions";
import {
  countryNamesMatch,
  filterBoundaryPolygonsByMapContext,
  parseCountryBoundaryPolygons,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";
import type { MapMarkerPresentation } from "@/lib/map-region-markers";
import {
  useMapUiStore,
  type CountryMarkerDisplayMode,
} from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

export type WorldMapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  resetWorldView: () => void;
  zoomBy: (direction: "in" | "out") => void;
};

export type MapZoomTier = "world" | "region" | "country";

const MIN_REGION_DELTA = 0.5;
const MAX_REGION_DELTA = 120;
const MIN_LATITUDE = -85;
const MAX_LATITUDE = 85;

function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) return WORLD_INITIAL_REGION.longitude;
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

function clampRegionDelta(delta: number, fallback: number): number {
  if (!Number.isFinite(delta)) return fallback;
  return Math.min(MAX_REGION_DELTA, Math.max(MIN_REGION_DELTA, delta));
}

function sanitizeRegion(region: Region, fallback: Region): Region {
  const latitude = Number.isFinite(region.latitude)
    ? Math.min(MAX_LATITUDE, Math.max(MIN_LATITUDE, region.latitude))
    : fallback.latitude;

  return {
    latitude,
    longitude: normalizeLongitude(region.longitude),
    latitudeDelta: clampRegionDelta(
      region.latitudeDelta,
      fallback.latitudeDelta,
    ),
    longitudeDelta: clampRegionDelta(
      region.longitudeDelta,
      fallback.longitudeDelta,
    ),
  };
}

type WorldMapViewProps = {
  countries: MapCountry[];
  /** Full country list for boundary region matching (markers may be a subset). */
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusedRegion: string | null;
  zoomTier: MapZoomTier;
  countryMarkerMode?: CountryMarkerDisplayMode;
  markerPresentation?: MapMarkerPresentation;
  markerRevealGeneration?: number;
  onCountryPress: (country: MapCountry) => void;
  onMapPress: (coordinate?: MapPressCoordinate) => void;
  onRegionChangeComplete?: (region: Region) => void;
  /** When true, user cannot pan or pinch-zoom (programmatic moves still work). */
  lockUserGestures?: boolean;
  suspendMarkerSnapshot?: boolean;
  markerRefreshToken?: number;
};

export const WorldMapView = forwardRef<WorldMapViewHandle, WorldMapViewProps>(
  function WorldMapView(
    {
      countries,
      boundaryCountries,
      selectedName,
      focusedRegion,
      zoomTier,
      countryMarkerMode = "flag",
      markerPresentation = "full",
      markerRevealGeneration = 0,
      onCountryPress,
      onMapPress,
      onRegionChangeComplete,
      lockUserGestures = false,
      suspendMarkerSnapshot = false,
      markerRefreshToken = 0,
    },
    ref,
  ) {
    const keepSingleMarkerLive = countries.length === 1;
    const mapRef = useRef<MapView>(null);
    const regionRef = useRef<Region>(WORLD_INITIAL_REGION);

    const animateToRegion = useCallback((region: Region, duration = 500) => {
      const safeRegion = sanitizeRegion(region, regionRef.current);
      regionRef.current = safeRegion;
      mapRef.current?.animateToRegion(safeRegion, duration);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion,
        resetWorldView: () => animateToRegion(WORLD_INITIAL_REGION),
        zoomBy: (direction) => {
          const current = regionRef.current;
          const scale = direction === "in" ? 0.65 : 1.45;
          const next = sanitizeRegion(
            {
              ...current,
              latitudeDelta: current.latitudeDelta * scale,
              longitudeDelta: current.longitudeDelta * scale,
            },
            WORLD_INITIAL_REGION,
          );
          animateToRegion(next, 300);
        },
      }),
      [animateToRegion],
    );

    const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
    const boundaryStyleRevision = useMapUiStore((s) => s.boundaryStyleRevision);
    const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);

    const allCountryBoundaries = useMemo(
      () => parseCountryBoundaryPolygons(countriesGeoJson),
      [],
    );

    const showWorldBoundaries =
      showBoundaryLines && !focusedRegion && !selectedName;

    const countryBoundaries = useMemo(
      () =>
        filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
          selectedCountryName: selectedName,
          focusedRegion,
          countries: boundaryCountries,
          showWorldBoundaries,
        }),
      [
        allCountryBoundaries,
        boundaryCountries,
        focusedRegion,
        selectedName,
        showWorldBoundaries,
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
    const boundariesTappable = zoomTier === "country" && !!focusedRegion;

    const handleBoundaryPress = useCallback(
      (polygon: CountryBoundaryPolygon) => {
        const country = boundaryCountries.find((c) =>
          countryNamesMatch(c.name, polygon.countryName),
        );
        if (country) onCountryPress(country);
      },
      [boundaryCountries, onCountryPress],
    );

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={WORLD_INITIAL_REGION}
        customMapStyle={MAP_DARK_STYLE}
        onPress={(event) => {
          const coordinate = event.nativeEvent.coordinate;
          if (!coordinate) {
            onMapPress(undefined);
            return;
          }

          const { latitude, longitude } = coordinate;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            onMapPress(undefined);
            return;
          }

          onMapPress({ latitude, longitude });
        }}
        onRegionChangeComplete={(region) => {
          const safeRegion = sanitizeRegion(region, regionRef.current);
          regionRef.current = safeRegion;
          onRegionChangeComplete?.(safeRegion);
        }}
        scrollEnabled={!lockUserGestures}
        zoomEnabled={!lockUserGestures}
        zoomTapEnabled={!lockUserGestures}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsScale={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType={Platform.OS === "android" ? "standard" : "hybridFlyover"}
      >
        {showBoundaryLines ? (
          <MapContinentFocusLayers
            focusedRegion={focusedRegion}
            allPolygons={allCountryBoundaries}
            boundaryCountries={boundaryCountries}
          />
        ) : null}
        {showBoundaryLines
          ? countryBoundaries.map((polygon) => (
              <Polygon
                key={`${polygon.id}-${boundaryRenderKey}-${boundaryStyleRevision}`}
                coordinates={polygon.coordinates}
                holes={polygon.holes}
                tappable={boundariesTappable}
                onPress={
                  boundariesTappable
                    ? () => handleBoundaryPress(polygon)
                    : undefined
                }
                strokeColor={outlineStrokeColor}
                strokeWidth={outlineStrokeWidth}
                fillColor={outlineFillColor}
                zIndex={1}
              />
            ))
          : null}
        {countries.map((country) => (
          <MapCountryMarker
            key={country.name}
            country={country}
            selected={selectedName === country.name}
            displayMode={countryMarkerMode}
            presentation={markerPresentation}
            revealGeneration={markerRevealGeneration}
            keepLive={keepSingleMarkerLive}
            suspendSnapshot={suspendMarkerSnapshot}
            refreshToken={markerRefreshToken}
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
