import type { ThreeEvent } from "@react-three/fiber/native";
import { useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";

import type { MapZoomTier } from "@/components/map/world-map-view";
import { buildGlobeBoundaryHitTargets } from "@/lib/globe-boundary-fills";
import { logGlobeTap } from "@/lib/globe-tap-debug";
import {
  countryNamesMatch,
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";
import { areRegionBoundariesTappable } from "@/lib/map-signal-sources";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

type GlobeBoundaryHitTargetsProps = {
  boundaryCountries: MapCountry[];
  selectedName: string | null;
  focusedRegion: string | null;
  boundaryFocusRegion?: string | null;
  zoomTier: MapZoomTier;
  onBoundaryCountryPress: (country: MapCountry) => void;
  /** Skip taps that exceeded the orbit drag threshold. */
  consumeTapThresholdExceeded: () => boolean;
  /** Reset drag guard when R3F sees a new pointer down. */
  beginPointerTap: () => void;
};

function BoundaryHitMesh({
  geometry,
  onPress,
  beginPointerTap,
}: {
  geometry: THREE.BufferGeometry;
  onPress: () => void;
  beginPointerTap: () => void;
}) {
  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  const handlePointerDown = useCallback(() => {
    beginPointerTap();
  }, [beginPointerTap]);

  const handlePress = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onPress();
    },
    [onPress],
  );

  return (
    <mesh
      geometry={geometry}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePress}
    >
      <meshBasicMaterial
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function GlobeBoundaryHitTargets({
  boundaryCountries,
  selectedName,
  focusedRegion,
  boundaryFocusRegion = focusedRegion,
  zoomTier,
  onBoundaryCountryPress,
  consumeTapThresholdExceeded,
  beginPointerTap,
}: GlobeBoundaryHitTargetsProps) {
  const showBoundaryLines = useMapUiStore((s) => s.showBoundaryLines);
  const boundaryStyle = useMapUiStore((s) => s.boundaryStyle);

  const highlightCountryName = selectedName;
  const showCountryHighlight =
    !!highlightCountryName && boundaryStyle.countryHighlightEnabled;
  const boundariesTappable = areRegionBoundariesTappable(
    boundaryFocusRegion,
    zoomTier,
    { allowWorldZoomGlobe: true },
  );
  const showBoundaryStrokes =
    boundaryStyle.strokeColorEnabled && showBoundaryLines;
  const showWorldBoundaries =
    showBoundaryLines && !boundaryFocusRegion && !highlightCountryName;

  const countryBoundaries = useMemo(() => {
    const all = getCountryBoundaryPolygons(countriesGeoJson);
    return filterBoundaryPolygonsByMapContext(all, {
      selectedCountryName: highlightCountryName,
      focusedRegion: boundaryFocusRegion,
      countries: boundaryCountries,
      showWorldBoundaries,
    });
  }, [
    boundaryCountries,
    boundaryFocusRegion,
    highlightCountryName,
    showWorldBoundaries,
  ]);

  const hitTargets = useMemo(
    () => buildGlobeBoundaryHitTargets(countryBoundaries),
    [countryBoundaries],
  );

  const handleBoundaryPress = useCallback(
    (countryName: string | null) => {
      if (consumeTapThresholdExceeded()) {
        logGlobeTap({
          source: "boundary-mesh",
          stage: "skip",
          outcome: "ignored-drag-threshold",
          country: countryName,
        });
        return;
      }
      if (!countryName) {
        logGlobeTap({
          source: "boundary-mesh",
          stage: "skip",
          outcome: "missing-country-name",
        });
        return;
      }

      const country =
        boundaryCountries.find((entry) =>
          countryNamesMatch(entry.name, countryName),
        ) ?? null;
      if (country) {
        logGlobeTap({
          source: "boundary-mesh",
          stage: "input",
          outcome: "boundary-mesh-hit",
          country: country.name,
          region: country.region,
          focusedRegion,
          boundaryFocusRegion,
          cameraTier: zoomTier,
        });
        onBoundaryCountryPress(country);
        return;
      }

      logGlobeTap({
        source: "boundary-mesh",
        stage: "skip",
        outcome: "country-not-in-list",
        country: countryName,
        focusedRegion,
        boundaryFocusRegion,
        cameraTier: zoomTier,
      });
    },
    [
      boundaryCountries,
      boundaryFocusRegion,
      consumeTapThresholdExceeded,
      focusedRegion,
      onBoundaryCountryPress,
      zoomTier,
    ],
  );

  if (
    !boundariesTappable ||
    !showBoundaryStrokes ||
    showCountryHighlight ||
    hitTargets.length === 0
  ) {
    return null;
  }

  return (
    <group>
      {hitTargets.map((target) => (
        <BoundaryHitMesh
          key={target.id}
          geometry={target.geometry}
          onPress={() => handleBoundaryPress(target.countryName)}
          beginPointerTap={beginPointerTap}
        />
      ))}
    </group>
  );
}
