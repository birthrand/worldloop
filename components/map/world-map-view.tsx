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
import { MapCountryFocusLayers } from "@/components/map/map-country-focus-layers";
import { MapCountryMarker } from "@/components/map/map-country-marker";
import {
  boundaryStyleRenderKey,
  resolveBoundaryStrokeColor,
  resolveBoundaryStrokeWidth,
} from "@/constants/map-boundary-style";
import { MAP_CONTINENT_FOCUS_POLYGON_Z } from "@/constants/map-continent-focus";
import {
  countryFocusStyleRenderKey,
  MAP_COUNTRY_FOCUS_STROKE_Z,
  resolveCountryFocusBoundaryStrokeColor,
  resolveCountryFocusBoundaryStrokeWidth,
} from "@/constants/map-country-focus";
import { MAP_DARK_STYLE } from "@/constants/map-dark-style";
import { WORLD_INITIAL_REGION } from "@/constants/map-regions";
import {
  countryNamesMatch,
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import { logMapDebug, summarizeRegion } from "@/lib/map-debug";
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
  pointForCoordinate: (
    coordinate: MapPressCoordinate,
  ) => Promise<{ x: number; y: number } | null>;
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
  focusTransitionName?: string | null;
  focusedRegion: string | null;
  continentOverlayRegion?: string | null;
  previewRegion?: string | null;
  zoomTier: MapZoomTier;
  countryMarkerMode?: CountryMarkerDisplayMode;
  markerPresentation?: MapMarkerPresentation;
  markerRevealGeneration?: number;
  onCountryPress: (country: MapCountry) => void;
  onMapPress: (coordinate?: MapPressCoordinate) => void;
  onMapReady?: () => void;
  /** Throttled continuous viewport updates — drives live zoom-tier/marker density. */
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  /** When true, user cannot pan or pinch-zoom (programmatic moves still work). */
  lockUserGestures?: boolean;
  suspendMarkerSnapshot?: boolean;
  markerRefreshToken?: number;
  /** When false (3D mode), skip flat highlight layers — globe renders them. */
  showFocusLayers?: boolean;
};

export const WorldMapView = forwardRef<WorldMapViewHandle, WorldMapViewProps>(
  function WorldMapView(
    {
      countries,
      boundaryCountries,
      selectedName,
      focusTransitionName = null,
      focusedRegion,
      continentOverlayRegion = focusedRegion,
      previewRegion = null,
      zoomTier,
      countryMarkerMode = "flag",
      markerPresentation = "full",
      markerRevealGeneration = 0,
      onCountryPress,
      onMapPress,
      onMapReady,
      onRegionChange,
      onRegionChangeComplete,
      lockUserGestures = false,
      suspendMarkerSnapshot = false,
      markerRefreshToken = 0,
      showFocusLayers = true,
    },
    ref,
  ) {
    const keepSingleMarkerLive = countries.length === 1;
    const mapRef = useRef<MapView>(null);
    const regionRef = useRef<Region>(WORLD_INITIAL_REGION);
    const lastRegionChangeEmitRef = useRef(0);

    const animateToRegion = useCallback((region: Region, duration = 500) => {
      const input = summarizeRegion(region);
      const safeRegion = sanitizeRegion(region, regionRef.current);
      const output = summarizeRegion(safeRegion);
      if (
        !input.finite ||
        input.lat !== output.lat ||
        input.latDelta !== output.latDelta
      ) {
        logMapDebug("camera", "world-map-view region sanitized", {
          duration,
          input,
          output,
          hasMapRef: !!mapRef.current,
        });
      }
      regionRef.current = safeRegion;
      try {
        mapRef.current?.animateToRegion(safeRegion, duration);
      } catch (err) {
        logMapDebug("camera", "ERROR world-map-view animateToRegion threw", {
          error: err instanceof Error ? err.message : String(err),
          output,
        });
        throw err;
      }
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
        pointForCoordinate: async (coordinate) => {
          try {
            const point = await mapRef.current?.pointForCoordinate({
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
            });
            if (!point) return null;
            return { x: point.x, y: point.y };
          } catch {
            return null;
          }
        },
      }),
      [animateToRegion],
    );

    const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
    const boundaryStyleRevision = useMapUiStore((s) => s.boundaryStyleRevision);
    const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);

    const allCountryBoundaries = getCountryBoundaryPolygons(countriesGeoJson);

    const showWorldBoundaries =
      showBoundaryLines && !focusedRegion && !selectedName;

    const highlightCountryName = selectedName;
    const showCountryHighlight =
      !!highlightCountryName && boundaryStyle.countryHighlightEnabled;
    const showBoundaryStrokes =
      boundaryStyle.strokeColorEnabled && showBoundaryLines;

    const countryBoundaries = useMemo(
      () =>
        filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
          selectedCountryName: highlightCountryName,
          focusedRegion,
          countries: boundaryCountries,
          showWorldBoundaries,
        }),
      [
        allCountryBoundaries,
        boundaryCountries,
        focusedRegion,
        highlightCountryName,
        showWorldBoundaries,
      ],
    );

    const outlineStrokeWidth = showCountryHighlight
      ? resolveCountryFocusBoundaryStrokeWidth(boundaryStyle)
      : resolveBoundaryStrokeWidth(boundaryStyle, zoomTier);
    const outlineStrokeColor = showCountryHighlight
      ? resolveCountryFocusBoundaryStrokeColor(boundaryStyle)
      : resolveBoundaryStrokeColor(boundaryStyle, zoomTier);
    /** Country outlines are stroke-only; continent overlay uses fill settings. */
    const outlineFillColor = "rgba(0,0,0,0)";
    const boundaryRenderKey = showCountryHighlight
      ? countryFocusStyleRenderKey(boundaryStyle)
      : boundaryStyleRenderKey(boundaryStyle, zoomTier);
    const boundariesTappable = zoomTier === "country" && !!focusedRegion;
    const boundaryZIndex = showCountryHighlight
      ? MAP_COUNTRY_FOCUS_STROKE_Z
      : focusedRegion
        ? MAP_CONTINENT_FOCUS_POLYGON_Z + 2
        : 1;

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
        onMapReady={onMapReady}
        onRegionChange={
          onRegionChange
            ? (region) => {
                const now = Date.now();
                if (now - lastRegionChangeEmitRef.current < 90) return;
                lastRegionChangeEmitRef.current = now;
                onRegionChange(sanitizeRegion(region, regionRef.current));
              }
            : undefined
        }
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
        {showFocusLayers ? (
          <MapContinentFocusLayers
            focusedRegion={continentOverlayRegion}
            selectedCountryName={selectedName}
            previewRegion={previewRegion}
            allPolygons={allCountryBoundaries}
            boundaryCountries={boundaryCountries}
          />
        ) : null}
        <MapCountryFocusLayers
          selectedCountryName={showFocusLayers ? selectedName : null}
          focusTransitionName={focusTransitionName}
          allPolygons={allCountryBoundaries}
        />
        {showFocusLayers && showBoundaryStrokes && !showCountryHighlight
          ? countryBoundaries.map((polygon) => (
              <Polygon
                key={`country-boundary-${polygon.id}-${boundaryRenderKey}-${boundaryStyleRevision}`}
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
                zIndex={boundaryZIndex}
              />
            ))
          : null}
        {countries.map((country) => {
          const focusCountryName = selectedName ?? focusTransitionName ?? null;
          const isSelected = focusCountryName === country.name;
          const isFocusTransitioning =
            !!focusTransitionName &&
            focusTransitionName === country.name &&
            selectedName !== country.name;
          const isHighlighted = isSelected || isFocusTransitioning;

          return (
            <MapCountryMarker
              key={country.name}
              country={country}
              selected={isSelected}
              focusTransitioning={isFocusTransitioning}
              deemphasized={
                !!focusedRegion &&
                !!focusCountryName &&
                focusCountryName !== country.name
              }
              displayMode={countryMarkerMode}
              presentation={markerPresentation}
              revealGeneration={markerRevealGeneration}
              keepLive={keepSingleMarkerLive || isHighlighted}
              suspendSnapshot={suspendMarkerSnapshot && isHighlighted}
              refreshToken={isHighlighted ? markerRefreshToken : 0}
              onPress={() => onCountryPress(country)}
            />
          );
        })}
      </MapView>
    );
  },
);

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
