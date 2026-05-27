import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Region } from "react-native-maps";

import { GlobeView, type GlobeViewHandle } from "@/components/map/globe-view";
import {
  WorldMapView,
  type MapZoomTier,
  type WorldMapViewHandle,
} from "@/components/map/world-map-view";
import type { MapCluster } from "@/lib/map-clusters";
import { useMapStore } from "@/store/use-map-store";
import type { MapCountry } from "@/types/country";

export type MapCanvasHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  resetWorldView: () => void;
  zoomBy: (direction: "in" | "out") => void;
  focusCountryOnGlobe: (country: MapCountry, duration?: number) => void;
};

type MapCanvasProps = {
  countries: MapCountry[];
  boundaryCountries: MapCountry[];
  clusters: MapCluster[];
  selectedName: string | null;
  focusedRegion: string | null;
  zoomTier: MapZoomTier;
  onCountryPress: (country: MapCountry) => void;
  onClusterPress: (cluster: MapCluster) => void;
  onMapPress: () => void;
  onRegionChangeComplete?: (region: Region) => void;
};

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      countries,
      boundaryCountries,
      clusters,
      selectedName,
      focusedRegion,
      zoomTier,
      onCountryPress,
      onClusterPress,
      onMapPress,
      onRegionChangeComplete,
    },
    ref,
  ) {
    const mapMode = useMapStore((s) => s.mapMode);
    const mapRef = useRef<WorldMapViewHandle>(null);
    const globeRef = useRef<GlobeViewHandle>(null);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion: (region, duration) =>
          mapRef.current?.animateToRegion(region, duration),
        resetWorldView: () => {
          if (mapMode === "3d") {
            globeRef.current?.resetCamera();
            return;
          }
          mapRef.current?.resetWorldView();
        },
        zoomBy: (direction) => {
          if (mapMode === "3d") {
            globeRef.current?.zoomBy(direction);
            return;
          }
          mapRef.current?.zoomBy(direction);
        },
        focusCountryOnGlobe: (country, duration) =>
          globeRef.current?.focusCountry(country, duration),
      }),
      [mapMode],
    );

    if (mapMode === "3d") {
      return (
        <GlobeView
          ref={globeRef}
          countries={countries}
          onBackgroundPress={onMapPress}
        />
      );
    }

    return (
      <WorldMapView
        ref={mapRef}
        countries={countries}
        boundaryCountries={boundaryCountries}
        clusters={clusters}
        selectedName={selectedName}
        focusedRegion={focusedRegion}
        zoomTier={zoomTier}
        onCountryPress={onCountryPress}
        onClusterPress={onClusterPress}
        onMapPress={onMapPress}
        onRegionChangeComplete={onRegionChangeComplete}
      />
    );
  },
);
