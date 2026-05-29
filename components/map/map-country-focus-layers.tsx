import { useEffect, useMemo, useState } from "react";
import { Polygon } from "react-native-maps";
import {
  Easing,
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
import { useMapUiStore } from "@/store/use-map-ui-store";

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

type MapCountryFocusLayersProps = {
  selectedCountryName: string | null;
  /** In-flight focus animation — keeps fill visible while camera moves. */
  focusTransitionName?: string | null;
  allPolygons: CountryBoundaryPolygon[];
};

export function MapCountryFocusLayers({
  selectedCountryName,
  focusTransitionName = null,
  allPolygons,
}: MapCountryFocusLayersProps) {
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);
  const boundaryStyleRevision = useMapUiStore((s) => s.boundaryStyleRevision);
  const activeName = selectedCountryName ?? focusTransitionName;
  const blend = useSharedValue(0);
  const lastBlendStep = useSharedValue(-1);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [renderBlend, setRenderBlend] = useState(0);

  useEffect(() => {
    if (activeName) {
      setDisplayName(activeName);
      blend.value = withTiming(1, {
        duration: MAP_COUNTRY_FOCUS_FADE_MS,
        easing: Easing.inOut(Easing.ease),
      });
      return;
    }

    blend.value = withTiming(
      0,
      {
        duration: MAP_COUNTRY_FOCUS_FADE_MS,
        easing: Easing.inOut(Easing.ease),
      },
      (finished) => {
        if (finished) {
          runOnJS(setDisplayName)(null);
        }
      },
    );
  }, [activeName, blend]);

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
    if (!displayName) return [];
    return filterBoundaryPolygonsByMapContext(allPolygons, {
      selectedCountryName: displayName,
      focusedRegion: null,
      countries: [],
    }).filter(isRenderablePolygon);
  }, [allPolygons, displayName]);

  const fillColor = resolveCountryFocusFillRgba(boundaryStyle, renderBlend);
  const strokeColor = resolveCountryFocusStrokeRgba(boundaryStyle, renderBlend);
  const strokeWidth = resolveCountryFocusFillStrokeWidth(boundaryStyle);

  if (
    !boundaryStyle.countryHighlightEnabled ||
    !displayName ||
    renderBlend <= 0.001 ||
    countryPolygons.length === 0
  ) {
    return null;
  }

  return (
    <>
      {countryPolygons.map((polygon) => (
        <Polygon
          key={`country-focus-${polygon.id}-${boundaryStyleRevision}`}
          coordinates={polygon.coordinates}
          holes={polygon.holes}
          fillColor={fillColor}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          zIndex={MAP_COUNTRY_FOCUS_POLYGON_Z}
        />
      ))}
    </>
  );
}
