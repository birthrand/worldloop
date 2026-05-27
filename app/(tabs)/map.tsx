import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas, type MapCanvasHandle } from "@/components/map/map-canvas";
import { MapControls } from "@/components/map/map-controls";
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapLandingToast } from "@/components/map/map-landing-toast";
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapHeader } from "@/components/map/map-header";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapSearchRow } from "@/components/map/map-search-row";
import { MapLeftActionFabs } from "@/components/map/map-left-action-fabs";
import { type MapZoomTier } from "@/components/map/world-map-view";
import { regionForCountry } from "@/constants/map-regions";
import { buildMapClusters, type MapCluster } from "@/lib/map-clusters";
import {
  buildMapRandomPool,
  pickRandomMapCountry,
} from "@/lib/map-random-pick";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { filterMapCountriesByChip, useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import type { MapCountry } from "@/types/country";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);
  const zoomTierRef = useRef<MapZoomTier>("world");
  const isMapAnimatingRef = useRef(false);
  /** Blocks world-zoom reset while animating into a continent/country focus. */
  const suppressWorldResetRef = useRef(false);
  const mapAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const selectedCountry = useMapStore((s) => s.selectedCountry);
  const activeChip = useMapStore((s) => s.activeChip);
  const countries = useMapStore((s) => s.countries);
  const mapMode = useMapStore((s) => s.mapMode);
  const loadMapCountries = useMapStore((s) => s.loadMapCountries);
  const selectCountry = useMapStore((s) => s.selectCountry);
  const setActiveChip = useMapStore((s) => s.setActiveChip);
  const toggleMapMode = useMapStore((s) => s.toggleMapMode);
  const focusCountryOnGlobe = useMapStore((s) => s.focusCountryOnGlobe);

  const focusedRegion = useMapUiStore((s) => s.focusedRegion);
  const spotlightCountryName = useMapUiStore((s) => s.spotlightCountryName);
  const setDisplayMode = useMapUiStore((s) => s.setDisplayMode);
  const setFocusedRegion = useMapUiStore((s) => s.setFocusedRegion);
  const setFeaturedShortcut = useMapUiStore((s) => s.setFeaturedShortcut);
  const setSpotlightCountry = useMapUiStore((s) => s.setSpotlightCountry);
  const resetGlobalPulse = useMapUiStore((s) => s.resetGlobalPulse);
  const hasSeenMapOnboarding = useMapUiStore((s) => s.hasSeenMapOnboarding);
  const dismissMapOnboarding = useMapUiStore((s) => s.dismissMapOnboarding);

  const [zoomTier, setZoomTier] = useState<MapZoomTier>("world");
  const [landingMessage, setLandingMessage] = useState<string | null>(null);
  const [isNextCountryLoading, setIsNextCountryLoading] = useState(false);
  const is3d = mapMode === "3d";
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  const clusters = useMemo(() => buildMapClusters(countries), [countries]);

  const pinCountries = useMemo(() => {
    if (!focusedRegion) {
      if (!spotlightCountryName) return [];
      const spotlight =
        countries.find((c) => c.name === spotlightCountryName) ?? null;
      return spotlight ? [spotlight] : [];
    }
    const base = countries.filter((c) => c.region === focusedRegion);
    return filterMapCountriesByChip(base, activeChip);
  }, [focusedRegion, countries, activeChip, spotlightCountryName]);

  const mapMarkerCountries = useMemo(() => {
    const base = is3d ? countries : pinCountries;
    if (!spotlightCountryName) return base;
    return base.filter((c) => c.name === spotlightCountryName);
  }, [countries, is3d, pinCountries, spotlightCountryName]);

  const highlightedCountryName =
    selectedCountry?.name ?? spotlightCountryName ?? null;

  useEffect(() => {
    if (status === "idle" && countries.length === 0) {
      void loadMapCountries();
    }
  }, [status, countries.length, loadMapCountries]);

  const focusGlobeCountry = useCallback(
    (pick: MapCountry, duration = 650) => {
      selectCountry(pick.name);
      focusCountryOnGlobe(pick.name, duration);
    },
    [focusCountryOnGlobe, selectCountry],
  );

  const computeZoomTier = useCallback((latitudeDelta: number): MapZoomTier => {
    if (latitudeDelta > 60) return "world";
    if (latitudeDelta > 20) return "region";
    return "country";
  }, []);

  const animateMapToRegion = useCallback((region: Region, duration = 500) => {
    isMapAnimatingRef.current = true;
    if (mapAnimationTimerRef.current) {
      clearTimeout(mapAnimationTimerRef.current);
    }
    mapAnimationTimerRef.current = setTimeout(() => {
      isMapAnimatingRef.current = false;
      mapAnimationTimerRef.current = null;
    }, duration + 150);
    mapRef.current?.animateToRegion(region, duration);
  }, []);

  const focusCountry = useCallback(
    (country: MapCountry) => {
      if (spotlightCountryName) {
        selectCountry(country.name);
        if (is3d) {
          focusCountryOnGlobe(country.name, 450);
        } else {
          animateMapToRegion(regionForCountry(country.latlng), 500);
        }
        return;
      }

      if (is3d) {
        focusGlobeCountry(country, 450);
        return;
      }
      selectCountry(country.name);
      animateMapToRegion(regionForCountry(country.latlng), 500);
    },
    [
      animateMapToRegion,
      focusCountryOnGlobe,
      focusGlobeCountry,
      is3d,
      selectCountry,
      spotlightCountryName,
    ],
  );

  const handleClusterPress = useCallback(
    (cluster: MapCluster) => {
      selectCountry(null);
      setSpotlightCountry(null);
      setFeaturedShortcut(null);
      setDisplayMode("explore");
      suppressWorldResetRef.current = true;
      setFocusedRegion(cluster.region);
      zoomTierRef.current = "region";
      setZoomTier("region");
      animateMapToRegion(regionForCountry(cluster.center, 45), 650);
    },
    [
      animateMapToRegion,
      selectCountry,
      setDisplayMode,
      setFocusedRegion,
      setFeaturedShortcut,
      setSpotlightCountry,
    ],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (is3d) return;

      const nextTier = computeZoomTier(region.latitudeDelta);

      if (isMapAnimatingRef.current) {
        if (zoomTierRef.current !== nextTier) {
          // Mid-animation frames can still look like "world" zoom — don't hide pins.
          if (suppressWorldResetRef.current && nextTier === "world") {
            return;
          }
          zoomTierRef.current = nextTier;
          setZoomTier(nextTier);
        }
        return;
      }

      if (zoomTierRef.current === nextTier) return;
      zoomTierRef.current = nextTier;
      setZoomTier(nextTier);

      if (nextTier === "world") {
        if (!suppressWorldResetRef.current) {
          resetGlobalPulse();
          selectCountry(null);
          setSpotlightCountry(null);
        }
        return;
      }

      suppressWorldResetRef.current = false;
      setDisplayMode("explore");

      const currentFocused = useMapUiStore.getState().focusedRegion;
      if (!currentFocused && clusters.length > 0) {
        const centerLat = region.latitude;
        const centerLng = region.longitude;
        let nearest: (typeof clusters)[number] | null = null;
        let best = Number.POSITIVE_INFINITY;

        for (const cluster of clusters) {
          const dLat = cluster.center[0] - centerLat;
          const dLng = cluster.center[1] - centerLng;
          const d = dLat * dLat + dLng * dLng;
          if (d < best) {
            best = d;
            nearest = cluster;
          }
        }

        if (nearest) setFocusedRegion(nearest.region);
      }
    },
    [
      clusters,
      computeZoomTier,
      is3d,
      resetGlobalPulse,
      selectCountry,
      setDisplayMode,
      setFocusedRegion,
      setSpotlightCountry,
    ],
  );

  const flyMapToCountry = useCallback(
    (pick: MapCountry, duration = 650) => {
      if (is3d) {
        focusCountryOnGlobe(pick.name, duration);
        return;
      }

      setDisplayMode("explore");
      suppressWorldResetRef.current = true;
      setFocusedRegion(pick.region);
      zoomTierRef.current = "region";
      setZoomTier("region");
      animateMapToRegion(regionForCountry(pick.latlng, 45), duration);
    },
    [
      animateMapToRegion,
      focusCountryOnGlobe,
      is3d,
      setDisplayMode,
      setFocusedRegion,
    ],
  );

  const showLandingToast = useCallback((countryName: string) => {
    setLandingMessage(`You landed in ${countryName}`);
  }, []);

  const spotlightOnMap = useCallback(
    (pick: MapCountry) => {
      selectCountry(null);
      setSpotlightCountry(pick.name);
      setActiveChip("all");
      setFeaturedShortcut(null);
      flyMapToCountry(pick, 650);
    },
    [
      flyMapToCountry,
      selectCountry,
      setActiveChip,
      setFeaturedShortcut,
      setSpotlightCountry,
    ],
  );

  const advanceToCountryPreview = useCallback(
    (pick: MapCountry) => {
      selectCountry(pick.name);
      setSpotlightCountry(pick.name);
      flyMapToCountry(pick, 650);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showLandingToast(pick.name);
    },
    [flyMapToCountry, selectCountry, setSpotlightCountry, showLandingToast],
  );

  const handleForYouPress = useCallback(async () => {
    if (countries.length === 0) return;

    useRecentlyViewedStore.getState().seedIfEmpty();
    const entries = useRecentlyViewedStore.getState().entries;
    const topName = entries[0]?.country?.name?.trim() ?? "";
    const direct = countries.find((c) => c.name === topName) ?? null;

    let pick = direct;
    if (!pick) {
      const feed = useCountryFeedStore.getState();
      if (feed.countries.length === 0 && feed.status === "idle") {
        await feed.loadInitialFeed();
      }
      const feedTop = feed.countries.slice(0, 3);
      pick =
        feedTop
          .map((fc) => countries.find((c) => c.name === fc.name))
          .find(Boolean) ?? null;
    }

    if (!pick) {
      pick = countries[0] ?? null;
    }

    if (!pick) {
      return;
    }

    if (is3d) {
      setActiveChip("all");
      setFeaturedShortcut("forYou");
      focusGlobeCountry(pick);
      return;
    }

    setActiveChip("all");
    setFeaturedShortcut("forYou");
    setDisplayMode("explore");
    setFocusedRegion(pick.region);
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    animateMapToRegion(regionForCountry(pick.latlng, 45), 650);
  }, [
    animateMapToRegion,
    countries,
    focusGlobeCountry,
    is3d,
    selectCountry,
    setActiveChip,
    setDisplayMode,
    setFeaturedShortcut,
    setFocusedRegion,
  ]);

  const handleNewActivityPress = useCallback(async () => {
    if (countries.length === 0) return;

    const feed = useCountryFeedStore.getState();
    if (feed.countries.length === 0 && feed.status === "idle") {
      await feed.loadInitialFeed();
    }

    const feedTop = feed.countries.slice(0, 3);
    const pick =
      feedTop
        .map((fc) => countries.find((c) => c.name === fc.name))
        .find(Boolean) ?? countries[0];

    if (!pick) return;

    if (is3d) {
      setActiveChip("all");
      setFeaturedShortcut("newActivity");
      focusGlobeCountry(pick);
      return;
    }

    setActiveChip("all");
    setFeaturedShortcut("newActivity");
    setDisplayMode("explore");
    setFocusedRegion(pick.region);
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    animateMapToRegion(regionForCountry(pick.latlng, 45), 650);
  }, [
    animateMapToRegion,
    countries,
    focusGlobeCountry,
    is3d,
    selectCountry,
    setActiveChip,
    setDisplayMode,
    setFeaturedShortcut,
    setFocusedRegion,
  ]);

  const handleRandomCountry = useCallback(async () => {
    if (countries.length === 0) return;

    const pool = await buildMapRandomPool({
      countries,
      activeChip,
      featuredShortcut,
      focusedRegion,
      useWorldPool: is3d || zoomTierRef.current === "world",
    });
    const pick = pickRandomMapCountry(pool);
    if (!pick) return;

    spotlightOnMap(pick);
  }, [
    activeChip,
    countries,
    featuredShortcut,
    focusedRegion,
    is3d,
    spotlightOnMap,
  ]);

  const handleNextCountry = useCallback(async () => {
    if (!selectedCountry || countries.length === 0 || isNextCountryLoading) {
      return;
    }

    setIsNextCountryLoading(true);
    try {
      const pool = await buildMapRandomPool({
        countries,
        activeChip,
        featuredShortcut,
        focusedRegion,
        useWorldPool: is3d || zoomTierRef.current === "world",
      });
      const pick = pickRandomMapCountry(pool, selectedCountry.name);
      if (!pick) return;

      advanceToCountryPreview(pick);
    } finally {
      setIsNextCountryLoading(false);
    }
  }, [
    activeChip,
    advanceToCountryPreview,
    countries,
    featuredShortcut,
    focusedRegion,
    is3d,
    isNextCountryLoading,
    selectedCountry,
  ]);

  const handleReset = useCallback(() => {
    suppressWorldResetRef.current = false;
    mapRef.current?.resetWorldView();
    resetGlobalPulse();
    setZoomTier("world");
    zoomTierRef.current = "world";
    selectCountry(null);
    setSpotlightCountry(null);
    setActiveChip("all");
  }, [resetGlobalPulse, selectCountry, setActiveChip, setSpotlightCountry]);

  const dismissPreview = useCallback(() => {
    selectCountry(null);
  }, [selectCountry]);

  const deselectCountry = useCallback(() => {
    suppressWorldResetRef.current = false;
    selectCountry(null);
    setSpotlightCountry(null);
    resetGlobalPulse();
  }, [resetGlobalPulse, selectCountry, setSpotlightCountry]);

  const handleMapBackgroundPress = useCallback(() => {
    if (selectedCountry) {
      dismissPreview();
      return;
    }

    if (!spotlightCountryName && !focusedRegion) {
      return;
    }

    deselectCountry();
  }, [
    deselectCountry,
    dismissPreview,
    focusedRegion,
    selectedCountry,
    spotlightCountryName,
  ]);

  const bottomPad = Math.max(insets.bottom, 16) + 88;
  const showOnboarding =
    !hasSeenMapOnboarding &&
    (is3d || zoomTier === "world") &&
    status !== "loading" &&
    countries.length > 0 &&
    selectedCountry === null &&
    spotlightCountryName === null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <MapCanvas
        ref={mapRef}
        countries={mapMarkerCountries}
        boundaryCountries={countries}
        clusters={clusters}
        selectedName={highlightedCountryName}
        focusedRegion={focusedRegion}
        zoomTier={is3d ? "region" : zoomTier}
        onCountryPress={focusCountry}
        onClusterPress={handleClusterPress}
        onMapPress={handleMapBackgroundPress}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View pointerEvents="box-none" className="gap-2">
          <MapHeader onGlobePress={toggleMapMode} />
          <MapSearchRow />
          {is3d || zoomTier === "world" || !focusedRegion ? (
            <MapFeaturedChips
              onForYouPress={() => void handleForYouPress()}
              onNewActivityPress={() => void handleNewActivityPress()}
            />
          ) : (
            <MapFilterChips />
          )}
        </View>

        {status === "loading" ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : null}

        {status === "error" ? (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#fbbf24" />
            <Text className="min-w-0 flex-1 body-sm text-white/85">
              {error ?? "Could not load map data"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading map"
              onPress={() => void loadMapCountries()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text className="font-semibold text-sm text-tab-active">
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {landingMessage ? (
          <MapLandingToast
            message={landingMessage}
            onDismiss={() => setLandingMessage(null)}
          />
        ) : null}

        {selectedCountry ? (
          <>
            {!is3d ? (
              <Pressable
                style={styles.dismissBackdrop}
                onPress={dismissPreview}
                accessibilityRole="button"
                accessibilityLabel="Dismiss country preview"
              />
            ) : null}
            <View
              style={[styles.previewWrap, { bottom: bottomPad }]}
              pointerEvents="box-none"
            >
              <MapCountryPreviewCard
                country={selectedCountry}
                onNextCountry={() => void handleNextCountry()}
                isNextCountryLoading={isNextCountryLoading}
              />
            </View>
          </>
        ) : showOnboarding ? (
          <View style={[styles.previewWrap, { bottom: bottomPad }]}>
            <MapOnboardingSheet onDismiss={() => dismissMapOnboarding()} />
          </View>
        ) : null}

        <MapControls
          onReset={handleReset}
          onZoomIn={() => mapRef.current?.zoomBy("in")}
          onZoomOut={() => mapRef.current?.zoomBy("out")}
        />

        <MapLeftActionFabs
          onRandomPress={() => void handleRandomCountry()}
          showBoundaryControls={!is3d}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 19, 43, 0.35)",
  },
  errorBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "42%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(18, 24, 38, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dismissBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
