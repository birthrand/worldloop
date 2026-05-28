import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { MapZoomTier } from "@/components/map/world-map-view";
import {
  boundaryStyleRenderKey,
  resolveBoundaryStrokeColor,
} from "@/constants/map-boundary-style";
import {
  buildGlobeBoundaryLines,
  parseCssColorToThree,
} from "@/lib/globe-boundary-lines";
import {
  filterBoundaryPolygonsByMapContext,
  parseCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

type GlobeBoundaryLinesProps = {
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusedRegion: string | null;
};

function resolveGlobeZoomTier(
  selectedName: string | null,
  focusedRegion: string | null,
): MapZoomTier {
  if (selectedName) return "country";
  if (focusedRegion) return "region";
  return "world";
}

function BoundaryLineSegment({
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

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthTest
        depthWrite={false}
      />
    </line>
  );
}

export function GlobeBoundaryLines({
  boundaryCountries,
  selectedName,
  focusedRegion,
}: GlobeBoundaryLinesProps) {
  const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);

  const zoomTier = resolveGlobeZoomTier(selectedName, focusedRegion);

  const showWorldBoundaries =
    showBoundaryLines && !focusedRegion && !selectedName;

  const countryBoundaries = useMemo(() => {
    const all = parseCountryBoundaryPolygons(countriesGeoJson);
    return filterBoundaryPolygonsByMapContext(all, {
      selectedCountryName: selectedName,
      focusedRegion,
      countries: boundaryCountries,
      showWorldBoundaries,
    });
  }, [boundaryCountries, focusedRegion, selectedName, showWorldBoundaries]);

  const strokeColor = resolveBoundaryStrokeColor(boundaryStyle, zoomTier);
  const styleKey = boundaryStyleRenderKey(boundaryStyle, zoomTier);

  const lineSegments = useMemo(
    () => buildGlobeBoundaryLines(countryBoundaries),
    [countryBoundaries, strokeColor, styleKey],
  );

  const { threeColor, opacity } = useMemo(
    () => parseCssColorToThree(strokeColor),
    [strokeColor],
  );

  if (!showBoundaryLines || lineSegments.length === 0) {
    return null;
  }

  return (
    <group>
      {lineSegments.map((segment) => (
        <BoundaryLineSegment
          key={segment.id}
          geometry={segment.geometry}
          color={threeColor}
          opacity={opacity}
        />
      ))}
    </group>
  );
}
