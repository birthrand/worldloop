import { useEffect, useMemo, useState } from "react";
import type { LatLng } from "react-native-maps";
import { Polygon } from "react-native-maps";
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  MAP_COUNTRY_FOCUS_FADE_MS,
  MAP_COUNTRY_FOCUS_POLYGON_Z,
  resolveCountryFocusFillRgba,
  resolveCountryFocusFillStrokeWidth,
  resolveCountryFocusStrokeRgba,
} from "@/constants/map-country-focus";
import {
  filterBoundaryPolygonsByMapContext,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import { resolveCountryFocusRenderPolygons } from "@/lib/map-country-focus-polygons";
import { useMapUiStore } from "@/store/use-map-ui-store";

/** Limit polygon color updates during fades — per-frame setState can crash MapView. */
const BLEND_REACTION_STEPS = 8;

/** Stable slot count — reuse native Polygon views instead of unmounting (prevents ghost overlays). */
const COUNTRY_FOCUS_SLOT_COUNT = 24;

const TRANSPARENT = "rgba(0, 0, 0, 0)";

/** Degenerate ring — keeps the slot mounted while clearing the native overlay. */
const CLEARED_COORDS: LatLng[] = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 0.0001 },
  { latitude: 0.0001, longitude: 0 },
];

function isRenderablePolygon(polygon: CountryBoundaryPolygon): boolean {
  if (polygon.coordinates.length < 3) return false;

  return polygon.coordinates.every(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      Math.abs(point.latitude) <= 90,
  );
}

type MapCountryFocusLayersProps = {
  selectedCountryName: string | null;
  /** In-flight focus animation — keeps fill visible while camera moves. */
  focusTransitionName?: string | null;
  allPolygons: CountryBoundaryPolygon[];
  /** Solid fill when continent overlay sits below (no lake/bay holes). */
  fillGapsWhenContinentOverlay?: boolean;
};

export function MapCountryFocusLayers({
  selectedCountryName,
  focusTransitionName: _focusTransitionName = null,
  allPolygons,
  fillGapsWhenContinentOverlay = false,
}: MapCountryFocusLayersProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const boundaryStyleRevision = useMapUiStore((s) => s.boundaryStyleRevision);
  const highlightName = selectedCountryName;
  const blend = useSharedValue(highlightName ? 1 : 0);
  const lastBlendStep = useSharedValue(-1);
  const [renderBlend, setRenderBlend] = useState(highlightName ? 1 : 0);

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
    const filtered = filterBoundaryPolygonsByMapContext(allPolygons, {
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
  }, [allPolygons, fillGapsWhenContinentOverlay, highlightName, renderBlend]);

  const fillColor = resolveCountryFocusFillRgba(boundaryStyle, renderBlend);
  const strokeColor = resolveCountryFocusStrokeRgba(boundaryStyle, renderBlend);
  const strokeWidth = resolveCountryFocusFillStrokeWidth(boundaryStyle);
  const isVisible =
    boundaryStyle.countryHighlightEnabled &&
    !!highlightName &&
    renderBlend > 0.001 &&
    countryPolygons.length > 0;

  if (!boundaryStyle.countryHighlightEnabled) {
    return null;
  }

  return (
    <>
      {Array.from({ length: COUNTRY_FOCUS_SLOT_COUNT }, (_, slotIndex) => {
        const polygon = isVisible ? countryPolygons[slotIndex] : undefined;

        return (
          <Polygon
            key={`country-focus-slot-${slotIndex}-${boundaryStyleRevision}`}
            coordinates={polygon?.coordinates ?? CLEARED_COORDS}
            holes={polygon?.holes}
            fillColor={polygon ? fillColor : TRANSPARENT}
            strokeColor={polygon ? strokeColor : TRANSPARENT}
            strokeWidth={polygon ? strokeWidth : 0}
            zIndex={MAP_COUNTRY_FOCUS_POLYGON_Z}
          />
        );
      })}
    </>
  );
}
