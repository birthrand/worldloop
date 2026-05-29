import { useEffect, useMemo, useState } from "react";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as THREE from "three";

import { resolveContinentFocusFillRgba } from "@/constants/map-boundary-style";
import {
  MAP_CONTINENT_FOCUS_FADE_MS,
  continentFocusFillOpacityFactor,
  continentPreviewFillOpacityFactor,
} from "@/constants/map-continent-focus";
import { buildGlobeBoundaryFills } from "@/lib/globe-boundary-fills";
import { parseCssColorToThree } from "@/lib/globe-boundary-lines";
import {
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

/** Limit opacity updates during fades — per-frame setState can overload the GL thread. */
const BLEND_REACTION_STEPS = 8;

function isRenderablePolygon(polygon: CountryBoundaryPolygon): boolean {
  if (polygon.coordinates.length < 3) return false;

  return polygon.coordinates.every(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      Math.abs(point.latitude) <= 90,
  );
}

function GlobeContinentFocusFillMesh({
  geometry,
  color,
  opacity,
}: {
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
  opacity: number;
}) {
  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  if (opacity <= 0.001) return null;

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

type GlobeContinentFocusLayersProps = {
  focusedRegion: string | null;
  selectedCountryName?: string | null;
  previewRegion?: string | null;
  boundaryCountries: MapCountry[];
};

export function GlobeContinentFocusLayers({
  focusedRegion,
  selectedCountryName = null,
  previewRegion = null,
  boundaryCountries,
}: GlobeContinentFocusLayersProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);

  const blend = useSharedValue(0);
  const previewBlend = useSharedValue(0);
  const lastBlendStep = useSharedValue(-1);
  const lastPreviewBlendStep = useSharedValue(-1);
  const [displayRegion, setDisplayRegion] = useState<string | null>(null);
  const [displayPreviewRegion, setDisplayPreviewRegion] = useState<
    string | null
  >(null);
  const [renderBlend, setRenderBlend] = useState(0);
  const [renderPreviewBlend, setRenderPreviewBlend] = useState(0);

  const allCountryBoundaries = getCountryBoundaryPolygons(countriesGeoJson);

  useEffect(() => {
    if (focusedRegion) {
      setDisplayRegion(focusedRegion);
      blend.value = withTiming(1, {
        duration: MAP_CONTINENT_FOCUS_FADE_MS,
        easing: Easing.inOut(Easing.ease),
      });
      return;
    }

    blend.value = withTiming(
      0,
      {
        duration: MAP_CONTINENT_FOCUS_FADE_MS,
        easing: Easing.inOut(Easing.ease),
      },
      (finished) => {
        if (finished) {
          runOnJS(setDisplayRegion)(null);
        }
      },
    );
  }, [blend, focusedRegion]);

  useEffect(() => {
    if (previewRegion && !focusedRegion) {
      setDisplayPreviewRegion(previewRegion);
      previewBlend.value = withTiming(1, {
        duration: MAP_CONTINENT_FOCUS_FADE_MS * 0.6,
        easing: Easing.out(Easing.ease),
      });
      return;
    }

    if (previewRegion && focusedRegion) {
      setDisplayPreviewRegion(null);
      previewBlend.value = 0;
      return;
    }

    previewBlend.value = withTiming(
      0,
      {
        duration: MAP_CONTINENT_FOCUS_FADE_MS * 0.5,
        easing: Easing.inOut(Easing.ease),
      },
      (finished) => {
        if (finished) {
          runOnJS(setDisplayPreviewRegion)(null);
        }
      },
    );
  }, [focusedRegion, previewBlend, previewRegion]);

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

  useAnimatedReaction(
    () => previewBlend.value,
    (value) => {
      const step =
        Math.round(value * BLEND_REACTION_STEPS) / BLEND_REACTION_STEPS;
      if (step === lastPreviewBlendStep.value) return;
      lastPreviewBlendStep.value = step;
      runOnJS(setRenderPreviewBlend)(step);
    },
    [lastPreviewBlendStep, previewBlend],
  );

  const continentPolygons = useMemo(() => {
    if (!displayRegion) return [];
    return filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
      selectedCountryName: null,
      focusedRegion: displayRegion,
      countries: boundaryCountries,
    }).filter(isRenderablePolygon);
  }, [allCountryBoundaries, boundaryCountries, displayRegion]);

  const previewPolygons = useMemo(() => {
    if (!displayPreviewRegion) return [];
    return filterBoundaryPolygonsByMapContext(allCountryBoundaries, {
      selectedCountryName: null,
      focusedRegion: displayPreviewRegion,
      countries: boundaryCountries,
    }).filter(isRenderablePolygon);
  }, [allCountryBoundaries, boundaryCountries, displayPreviewRegion]);

  const committedFill = useMemo(
    () =>
      parseCssColorToThree(
        resolveContinentFocusFillRgba(
          boundaryStyle,
          renderBlend * continentFocusFillOpacityFactor(!!selectedCountryName),
        ),
      ),
    [boundaryStyle, renderBlend, selectedCountryName],
  );

  const previewFill = useMemo(
    () =>
      parseCssColorToThree(
        resolveContinentFocusFillRgba(
          boundaryStyle,
          renderPreviewBlend * continentPreviewFillOpacityFactor(),
        ),
      ),
    [boundaryStyle, renderPreviewBlend],
  );

  const committedMeshes = useMemo(
    () => buildGlobeBoundaryFills(continentPolygons),
    [continentPolygons],
  );

  const previewMeshes = useMemo(
    () => buildGlobeBoundaryFills(previewPolygons),
    [previewPolygons],
  );

  const showCommitted = displayRegion && renderBlend > 0.001;
  const showPreview =
    displayPreviewRegion && renderPreviewBlend > 0.001 && !focusedRegion;

  if (!boundaryStyle.fillEnabled || (!showCommitted && !showPreview)) {
    return null;
  }

  return (
    <group>
      {showPreview
        ? previewMeshes.map((mesh) => (
            <GlobeContinentFocusFillMesh
              key={`globe-continent-preview-${mesh.id}`}
              geometry={mesh.geometry}
              color={previewFill.threeColor}
              opacity={previewFill.opacity}
            />
          ))
        : null}
      {showCommitted
        ? committedMeshes.map((mesh) => (
            <GlobeContinentFocusFillMesh
              key={`globe-continent-focus-${mesh.id}`}
              geometry={mesh.geometry}
              color={committedFill.threeColor}
              opacity={committedFill.opacity}
            />
          ))
        : null}
    </group>
  );
}
