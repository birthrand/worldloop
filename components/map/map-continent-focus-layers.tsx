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
  MAP_CONTINENT_FOCUS_FADE_MS,
  MAP_CONTINENT_FOCUS_FILL_OPACITY,
  MAP_CONTINENT_FOCUS_POLYGON_Z,
  MAP_CONTINENT_FOCUS_SCRIM_Z,
  MAP_SCRIM_MAX_OPACITY,
  MAP_WORLD_SCRIM_RING,
  mapFocusAccentRgba,
  mapFocusScrimRgba,
} from "@/constants/map-continent-focus";
import {
  filterBoundaryPolygonsByMapContext,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import type { MapCountry } from "@/types/country";

type MapContinentFocusLayersProps = {
  focusedRegion: string | null;
  allPolygons: CountryBoundaryPolygon[];
  boundaryCountries: MapCountry[];
};

export function MapContinentFocusLayers({
  focusedRegion,
  allPolygons,
  boundaryCountries,
}: MapContinentFocusLayersProps) {
  const blend = useSharedValue(0);
  const [displayRegion, setDisplayRegion] = useState<string | null>(null);
  const [renderBlend, setRenderBlend] = useState(0);

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

  useAnimatedReaction(
    () => blend.value,
    (value) => {
      runOnJS(setRenderBlend)(value);
    },
    [blend],
  );

  const continentPolygons = useMemo(() => {
    if (!displayRegion) return [];
    return filterBoundaryPolygonsByMapContext(allPolygons, {
      selectedCountryName: null,
      focusedRegion: displayRegion,
      countries: boundaryCountries,
    });
  }, [allPolygons, boundaryCountries, displayRegion]);

  const scrimFill = mapFocusScrimRgba(renderBlend * MAP_SCRIM_MAX_OPACITY);
  const fillColor = mapFocusAccentRgba(
    renderBlend * MAP_CONTINENT_FOCUS_FILL_OPACITY,
  );

  if (!displayRegion && renderBlend <= 0.001) {
    return null;
  }

  return (
    <>
      <Polygon
        coordinates={MAP_WORLD_SCRIM_RING}
        fillColor={scrimFill}
        strokeColor="rgba(0,0,0,0)"
        strokeWidth={0}
        zIndex={MAP_CONTINENT_FOCUS_SCRIM_Z}
      />
      {continentPolygons.map((polygon) => (
        <Polygon
          key={`continent-focus-${polygon.id}`}
          coordinates={polygon.coordinates}
          holes={polygon.holes}
          fillColor={fillColor}
          strokeColor="rgba(0,0,0,0)"
          strokeWidth={0}
          zIndex={MAP_CONTINENT_FOCUS_POLYGON_Z}
        />
      ))}
    </>
  );
}
