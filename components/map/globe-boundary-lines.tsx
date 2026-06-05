import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { MapZoomTier } from "@/components/map/world-map-view";
import { resolveBoundaryStrokeColor } from "@/constants/map-boundary-style";
import {
  buildGlobeBoundaryLines,
  parseCssColorToThree,
} from "@/lib/globe-boundary-lines";
import {
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

type GlobeBoundaryLinesProps = {
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusTransitionName?: string | null;
  /** Intent — which polygons to load (continent filter). */
  focusedRegion: string | null;
  /** Effective region for boundary strokes (may infer from view center). */
  boundaryFocusRegion?: string | null;
  /** Live globe camera tier — stroke width/color scaling. */
  zoomTier: MapZoomTier;
};

function BoundaryLineSegment({
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
      transparent: opacity < 1,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }, [geometry, color, opacity]);

  useEffect(() => {
    return () => {
      lineObject.material.dispose();
    };
  }, [lineObject]);

  return <primitive object={lineObject} />;
}

export function GlobeBoundaryLines({
  boundaryCountries,
  selectedName,
  focusTransitionName = null,
  focusedRegion,
  boundaryFocusRegion = focusedRegion,
  zoomTier,
}: GlobeBoundaryLinesProps) {
  const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);

  const highlightCountryName = selectedName;
  const showCountryHighlight =
    !!highlightCountryName && boundaryStyle.countryHighlightEnabled;
  const showBoundaryStrokes =
    boundaryStyle.strokeColorEnabled && showBoundaryLines;

  const showWorldBoundaries =
    showBoundaryLines && !boundaryFocusRegion && !highlightCountryName;

  const countryBoundaries = useMemo(() => {
    if (!showBoundaryStrokes || showCountryHighlight) return [];
    const all = getCountryBoundaryPolygons(countriesGeoJson);
    return filterBoundaryPolygonsByMapContext(all, {
      selectedCountryName: null,
      focusedRegion: boundaryFocusRegion,
      countries: boundaryCountries,
      showWorldBoundaries,
    });
  }, [
    boundaryCountries,
    boundaryFocusRegion,
    highlightCountryName,
    showBoundaryStrokes,
    showCountryHighlight,
    showWorldBoundaries,
  ]);

  const strokeColor = resolveBoundaryStrokeColor(boundaryStyle, zoomTier);

  const lineSegments = useMemo(
    () => buildGlobeBoundaryLines(countryBoundaries),
    [countryBoundaries],
  );

  useEffect(() => {
    return () => {
      for (const segment of lineSegments) {
        segment.geometry.dispose();
      }
    };
  }, [lineSegments]);

  const { threeColor, opacity } = useMemo(
    () => parseCssColorToThree(strokeColor),
    [strokeColor],
  );

  if (
    !showBoundaryStrokes ||
    showCountryHighlight ||
    lineSegments.length === 0
  ) {
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
