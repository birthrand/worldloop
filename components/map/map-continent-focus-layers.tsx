import { useEffect, useMemo, useState } from "react";
import { Polygon } from "react-native-maps";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { resolveContinentFocusFillRgba } from "@/constants/map-boundary-style";
import {
  MAP_CONTINENT_FOCUS_FADE_MS,
  MAP_CONTINENT_FOCUS_POLYGON_Z,
  MAP_CONTINENT_FOCUS_SCRIM_Z,
  MAP_CONTINENT_PREVIEW_SCRIM_OPACITY,
  MAP_SCRIM_MAX_OPACITY,
  MAP_SCRIM_MAX_OPACITY_WITH_COUNTRY,
  MAP_WORLD_SCRIM_RING,
  continentFocusFillOpacityFactor,
  continentPreviewFillOpacityFactor,
  mapFocusScrimRgba,
  resolveContinentFocusCoreStrokeWidth,
  resolveContinentFocusStrokeRgba,
} from "@/constants/map-continent-focus";
import {
  filterBoundaryPolygonsByMapContext,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

/** Limit polygon color updates during fades — per-frame setState can crash MapView. */
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

type MapContinentFocusLayersProps = {
  focusedRegion: string | null;
  /** Active country pin — softens overlay so it complements selection. */
  selectedCountryName?: string | null;
  /** Pending continent before intent delay commits. */
  previewRegion?: string | null;
  allPolygons: CountryBoundaryPolygon[];
  boundaryCountries: MapCountry[];
};

export function MapContinentFocusLayers({
  focusedRegion,
  selectedCountryName = null,
  previewRegion = null,
  allPolygons,
  boundaryCountries,
}: MapContinentFocusLayersProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const boundaryStyleRevision = useMapUiStore((s) => s.boundaryStyleRevision);
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
    return filterBoundaryPolygonsByMapContext(allPolygons, {
      selectedCountryName: null,
      focusedRegion: displayRegion,
      countries: boundaryCountries,
    }).filter(isRenderablePolygon);
  }, [allPolygons, boundaryCountries, displayRegion]);

  const previewPolygons = useMemo(() => {
    if (!displayPreviewRegion) return [];
    return filterBoundaryPolygonsByMapContext(allPolygons, {
      selectedCountryName: null,
      focusedRegion: displayPreviewRegion,
      countries: boundaryCountries,
    }).filter(isRenderablePolygon);
  }, [allPolygons, boundaryCountries, displayPreviewRegion]);

  const scrimFill = mapFocusScrimRgba(
    renderBlend *
      (selectedCountryName
        ? MAP_SCRIM_MAX_OPACITY_WITH_COUNTRY
        : MAP_SCRIM_MAX_OPACITY),
  );
  const fillColor = resolveContinentFocusFillRgba(
    boundaryStyle,
    renderBlend * continentFocusFillOpacityFactor(!!selectedCountryName),
  );
  const previewScrimFill = mapFocusScrimRgba(
    renderPreviewBlend * MAP_CONTINENT_PREVIEW_SCRIM_OPACITY,
  );
  const previewFillColor = resolveContinentFocusFillRgba(
    boundaryStyle,
    renderPreviewBlend * continentPreviewFillOpacityFactor(),
  );
  const continentStrokeWidth = selectedCountryName
    ? 0
    : resolveContinentFocusCoreStrokeWidth(boundaryStyle);
  const transparentStroke = "rgba(0, 0, 0, 0)";
  const committedStrokeColor = selectedCountryName
    ? transparentStroke
    : resolveContinentFocusStrokeRgba(boundaryStyle, renderBlend);
  const previewStrokeColor = selectedCountryName
    ? transparentStroke
    : resolveContinentFocusStrokeRgba(boundaryStyle, renderPreviewBlend);

  const showCommitted = displayRegion && renderBlend > 0.001;
  const showPreview =
    displayPreviewRegion && renderPreviewBlend > 0.001 && !focusedRegion;

  if (!showCommitted && !showPreview) {
    return null;
  }

  return (
    <>
      {showPreview ? (
        <Polygon
          coordinates={MAP_WORLD_SCRIM_RING}
          fillColor={previewScrimFill}
          strokeColor="rgba(0,0,0,0)"
          strokeWidth={0}
          zIndex={MAP_CONTINENT_FOCUS_SCRIM_Z}
        />
      ) : null}
      {showCommitted ? (
        <Polygon
          coordinates={MAP_WORLD_SCRIM_RING}
          fillColor={scrimFill}
          strokeColor="rgba(0,0,0,0)"
          strokeWidth={0}
          zIndex={MAP_CONTINENT_FOCUS_SCRIM_Z}
        />
      ) : null}
      {showPreview
        ? previewPolygons.map((polygon) => (
            <Polygon
              key={`continent-preview-${polygon.id}-${boundaryStyleRevision}`}
              coordinates={polygon.coordinates}
              holes={polygon.holes}
              fillColor={previewFillColor}
              strokeColor={previewStrokeColor}
              strokeWidth={continentStrokeWidth}
              zIndex={MAP_CONTINENT_FOCUS_POLYGON_Z}
            />
          ))
        : null}
      {showCommitted
        ? continentPolygons.map((polygon) => (
            <Polygon
              key={`continent-focus-${polygon.id}-${boundaryStyleRevision}`}
              coordinates={polygon.coordinates}
              holes={polygon.holes}
              fillColor={fillColor}
              strokeColor={committedStrokeColor}
              strokeWidth={continentStrokeWidth}
              zIndex={MAP_CONTINENT_FOCUS_POLYGON_Z + 1}
            />
          ))
        : null}
    </>
  );
}
