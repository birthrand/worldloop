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
  MAP_COUNTRY_FOCUS_FADE_MS,
  resolveCountryFocusFillRgba,
} from "@/constants/map-country-focus";
import { buildGlobeBoundaryFills } from "@/lib/globe-boundary-fills";
import { parseCssColorToThree } from "@/lib/globe-boundary-lines";
import {
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
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

type GlobeCountryFocusLayersProps = {
  selectedCountryName: string | null;
  focusTransitionName?: string | null;
};

export function GlobeCountryFocusLayers({
  selectedCountryName,
  focusTransitionName: _focusTransitionName = null,
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
    return filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
      selectedCountryName: highlightName,
      focusedRegion: null,
      countries: [],
    })
      .filter(isRenderablePolygon)
      .slice(0, COUNTRY_FOCUS_SLOT_COUNT);
  }, [allCountryBoundaries, highlightName, renderBlend]);

  const fill = useMemo(
    () =>
      parseCssColorToThree(
        resolveCountryFocusFillRgba(boundaryStyle, renderBlend),
      ),
    [boundaryStyle, renderBlend],
  );

  const fillMeshes = useMemo(
    () => buildGlobeBoundaryFills(countryPolygons),
    [countryPolygons],
  );

  if (!boundaryStyle.countryHighlightEnabled) {
    return null;
  }

  return (
    <group>
      {Array.from({ length: COUNTRY_FOCUS_SLOT_COUNT }, (_, slotIndex) => (
        <GlobeCountryFocusSlotMesh
          key={`globe-country-focus-slot-${slotIndex}`}
          geometry={fillMeshes[slotIndex]?.geometry ?? null}
          color={fill.threeColor}
          opacity={fill.opacity}
        />
      ))}
    </group>
  );
}
