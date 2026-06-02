import { useEffect, useMemo, useState } from "react";
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as THREE from "three";

import {
  GLOBE_COUNTRY_FOCUS_STROKE_GLOW_RADIUS_OFFSET,
  GLOBE_COUNTRY_FOCUS_STROKE_RADIUS_OFFSET,
  MAP_COUNTRY_FOCUS_FADE_MS,
  isCountryFocusFillEnabled,
  resolveCountryFocusFillRgba,
  resolveCountryFocusStrokeGlowRgba,
  resolveCountryFocusStrokeRgba,
} from "@/constants/map-country-focus";
import { buildGlobeBoundaryFills } from "@/lib/globe-boundary-fills";
import {
  buildGlobeBoundaryLines,
  globeBoundaryRadiusAtOffset,
  parseCssColorToThree,
} from "@/lib/globe-boundary-lines";
import {
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import { resolveCountryFocusRenderPolygons } from "@/lib/map-country-focus-polygons";
import { useMapUiStore } from "@/store/use-map-ui-store";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

/** Limit opacity updates during fades — per-frame setState can overload the GL thread. */
const BLEND_REACTION_STEPS = 8;

const COUNTRY_FOCUS_SLOT_COUNT = 24;

function isRenderablePolygon(polygon: CountryBoundaryPolygon): boolean {
  if (polygon.coordinates.length < 3) return false;

  return polygon.coordinates.every(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      Math.abs(point.latitude) <= 90,
  );
}

function GlobeCountryFocusSlotMesh({
  geometry,
  color,
  opacity,
}: {
  geometry: THREE.BufferGeometry | null;
  color: THREE.Color;
  opacity: number;
}) {
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry || opacity <= 0.001) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GlobeCountryFocusStrokeLine({
  geometry,
  color,
  opacity,
}: {
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
  opacity: number;
}) {
  const lineObject = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }, [geometry, color, opacity]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      lineObject.material.dispose();
    };
  }, [geometry, lineObject]);

  if (opacity <= 0.001) return null;

  return <primitive object={lineObject} />;
}

type GlobeCountryFocusLayersProps = {
  selectedCountryName: string | null;
  focusTransitionName?: string | null;
  fillGapsWhenContinentOverlay?: boolean;
};

export function GlobeCountryFocusLayers({
  selectedCountryName,
  focusTransitionName: _focusTransitionName = null,
  fillGapsWhenContinentOverlay = false,
}: GlobeCountryFocusLayersProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const highlightName = selectedCountryName;
  const blend = useSharedValue(highlightName ? 1 : 0);
  const lastBlendStep = useSharedValue(-1);
  const [renderBlend, setRenderBlend] = useState(highlightName ? 1 : 0);

  const allCountryBoundaries = getCountryBoundaryPolygons(countriesGeoJson);

  useEffect(() => {
    cancelAnimation(blend);

    if (highlightName) {
      blend.value = withTiming(1, {
        duration: MAP_COUNTRY_FOCUS_FADE_MS,
        easing: Easing.inOut(Easing.ease),
      });
      return;
    }

    blend.value = withTiming(0, {
      duration: MAP_COUNTRY_FOCUS_FADE_MS,
      easing: Easing.inOut(Easing.ease),
    });
  }, [blend, highlightName]);

  useAnimatedReaction(
    () => blend.value,
    (value) => {
      const step =
        Math.round(value * BLEND_REACTION_STEPS) / BLEND_REACTION_STEPS;
      if (step === lastBlendStep.value) return;
      lastBlendStep.value = step;
      runOnJS(setRenderBlend)(step);
    },
    [blend, lastBlendStep],
  );

  const countryPolygons = useMemo(() => {
    if (!highlightName || renderBlend <= 0.001) return [];
    const filtered = filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
      selectedCountryName: highlightName,
      focusedRegion: null,
      countries: [],
    })
      .filter(isRenderablePolygon)
      .slice(0, COUNTRY_FOCUS_SLOT_COUNT);

    return resolveCountryFocusRenderPolygons(
      filtered,
      fillGapsWhenContinentOverlay,
    );
  }, [
    allCountryBoundaries,
    fillGapsWhenContinentOverlay,
    highlightName,
    renderBlend,
  ]);

  const showSelectionFill = isCountryFocusFillEnabled(boundaryStyle);

  const fillMeshes = useMemo(() => {
    if (!showSelectionFill || countryPolygons.length === 0) return [];

    return buildGlobeBoundaryFills(countryPolygons, undefined, {
      omitHoles: fillGapsWhenContinentOverlay,
    });
  }, [countryPolygons, fillGapsWhenContinentOverlay, showSelectionFill]);

  const fill = useMemo(
    () =>
      parseCssColorToThree(
        resolveCountryFocusFillRgba(boundaryStyle, renderBlend),
      ),
    [boundaryStyle, renderBlend],
  );

  const stroke = useMemo(
    () =>
      parseCssColorToThree(
        resolveCountryFocusStrokeRgba(boundaryStyle, renderBlend),
      ),
    [boundaryStyle, renderBlend],
  );

  const strokeGlow = useMemo(
    () =>
      parseCssColorToThree(
        resolveCountryFocusStrokeGlowRgba(boundaryStyle, renderBlend),
      ),
    [boundaryStyle, renderBlend],
  );

  const strokeCoreRadius = useMemo(
    () => globeBoundaryRadiusAtOffset(GLOBE_COUNTRY_FOCUS_STROKE_RADIUS_OFFSET),
    [],
  );

  const strokeGlowRadius = useMemo(
    () =>
      globeBoundaryRadiusAtOffset(
        GLOBE_COUNTRY_FOCUS_STROKE_GLOW_RADIUS_OFFSET,
      ),
    [],
  );

  const strokeLines = useMemo(
    () => buildGlobeBoundaryLines(countryPolygons, strokeCoreRadius),
    [countryPolygons, strokeCoreRadius],
  );

  const strokeGlowLines = useMemo(
    () => buildGlobeBoundaryLines(countryPolygons, strokeGlowRadius),
    [countryPolygons, strokeGlowRadius],
  );

  if (!boundaryStyle.countryHighlightEnabled) {
    return null;
  }

  const isVisible =
    !!highlightName && renderBlend > 0.001 && countryPolygons.length > 0;

  if (!isVisible) {
    return null;
  }

  return (
    <group>
      {fillMeshes.map((mesh) => (
        <GlobeCountryFocusSlotMesh
          key={`globe-country-focus-fill-${mesh.id}`}
          geometry={mesh.geometry}
          color={fill.threeColor}
          opacity={fill.opacity}
        />
      ))}
      {strokeGlowLines.map((segment) => (
        <GlobeCountryFocusStrokeLine
          key={`globe-country-focus-glow-${segment.id}`}
          geometry={segment.geometry}
          color={strokeGlow.threeColor}
          opacity={strokeGlow.opacity}
        />
      ))}
      {strokeLines.map((segment) => (
        <GlobeCountryFocusStrokeLine
          key={`globe-country-focus-stroke-${segment.id}`}
          geometry={segment.geometry}
          color={stroke.threeColor}
          opacity={stroke.opacity}
        />
      ))}
    </group>
  );
}
