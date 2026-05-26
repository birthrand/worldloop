import { Ionicons } from "@expo/vector-icons";
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

import { MapControls } from "@/components/map/map-controls";
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapSearchRow } from "@/components/map/map-search-row";
import { RandomCountryFab } from "@/components/map/random-country-fab";
import {
  WorldMapView,
  type MapZoomTier,
  type WorldMapViewHandle,
} from "@/components/map/world-map-view";
import { regionForCountry } from "@/constants/map-regions";
import { TRENDING_COUNTRY_NAMES } from "@/constants/trending-countries";
import { buildMapClusters, type MapCluster } from "@/lib/map-clusters";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { filterMapCountriesByChip, useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import type { MapCountry } from "@/types/country";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<WorldMapViewHandle>(null);
  const zoomTierRef = useRef<MapZoomTier>("world");

  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const selectedCountry = useMapStore((s) => s.selectedCountry);
  const activeChip = useMapStore((s) => s.activeChip);
  const countries = useMapStore((s) => s.countries);
  const loadMapCountries = useMapStore((s) => s.loadMapCountries);
  const selectCountry = useMapStore((s) => s.selectCountry);
  const setActiveChip = useMapStore((s) => s.setActiveChip);

  const focusedRegion = useMapUiStore((s) => s.focusedRegion);
  const setDisplayMode = useMapUiStore((s) => s.setDisplayMode);
  const setFocusedRegion = useMapUiStore((s) => s.setFocusedRegion);
  const setFeaturedShortcut = useMapUiStore((s) => s.setFeaturedShortcut);
  const resetGlobalPulse = useMapUiStore((s) => s.resetGlobalPulse);
  const hasSeenMapOnboarding = useMapUiStore((s) => s.hasSeenMapOnboarding);
  const dismissMapOnboarding = useMapUiStore((s) => s.dismissMapOnboarding);

  const [zoomTier, setZoomTier] = useState<MapZoomTier>("world");
  const clusters = useMemo(() => buildMapClusters(countries), [countries]);

  const pinCountries = useMemo(() => {
    if (zoomTier === "world") return [];
    const base = focusedRegion
      ? countries.filter((c) => c.region === focusedRegion)
      : countries;
    return filterMapCountriesByChip(base, activeChip);
  }, [zoomTier, focusedRegion, countries, activeChip]);

  useEffect(() => {
    if (status === "idle" && countries.length === 0) {
      void loadMapCountries();
    }
  }, [status, countries.length, loadMapCountries]);

  const computeZoomTier = useCallback((latitudeDelta: number): MapZoomTier => {
    if (latitudeDelta > 60) return "world";
    if (latitudeDelta > 20) return "region";
    return "country";
  }, []);

  const focusCountry = useCallback(
    (country: MapCountry) => {
      selectCountry(country.name);
      mapRef.current?.animateToRegion(regionForCountry(country.latlng), 500);
    },
    [selectCountry],
  );

  const handleClusterPress = useCallback(
    (cluster: MapCluster) => {
      selectCountry(null);
      setFeaturedShortcut(null);
      setDisplayMode("explore");
      setFocusedRegion(cluster.region);
      zoomTierRef.current = "region";
      setZoomTier("region");
      mapRef.current?.animateToRegion(
        regionForCountry(cluster.center, 45),
        650,
      );
    },
    [selectCountry, setDisplayMode, setFocusedRegion, setFeaturedShortcut],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      const nextTier = computeZoomTier(region.latitudeDelta);
      if (zoomTierRef.current === nextTier) return;
      zoomTierRef.current = nextTier;
      setZoomTier(nextTier);

      if (nextTier === "world") {
        resetGlobalPulse();
        selectCountry(null);
        return;
      }

      setDisplayMode("explore");

      // If user pinches in without tapping a cluster, pick the closest cluster
      // so the map does not overwhelm with pins.
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
      resetGlobalPulse,
      selectCountry,
      setDisplayMode,
      setFocusedRegion,
    ],
  );

  const focusByMapCountry = useCallback(
    (pick: MapCountry) => {
      setActiveChip("all");
      setFeaturedShortcut(null);
      setDisplayMode("explore");
      setFocusedRegion(pick.region);
      zoomTierRef.current = "region";
      setZoomTier("region");
      selectCountry(pick.name);
      mapRef.current?.animateToRegion(regionForCountry(pick.latlng, 45), 650);
    },
    [
      selectCountry,
      setActiveChip,
      setDisplayMode,
      setFeaturedShortcut,
      setFocusedRegion,
    ],
  );

  const handleTrendingPress = useCallback(() => {
    if (countries.length === 0) return;
    const trending = countries.filter((c) =>
      TRENDING_COUNTRY_NAMES.has(c.name),
    );
    const pick = trending[0] ?? countries[0];
    if (!pick) return;
    setActiveChip("all");
    setFeaturedShortcut("trending");
    setDisplayMode("explore");
    setFocusedRegion(pick.region);
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    mapRef.current?.animateToRegion(regionForCountry(pick.latlng, 45), 650);
  }, [
    countries,
    selectCountry,
    setActiveChip,
    setDisplayMode,
    setFeaturedShortcut,
    setFocusedRegion,
  ]);

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
      handleTrendingPress();
      return;
    }

    setActiveChip("all");
    setFeaturedShortcut("forYou");
    setDisplayMode("explore");
    setFocusedRegion(pick.region);
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    mapRef.current?.animateToRegion(regionForCountry(pick.latlng, 45), 650);
  }, [
    countries,
    handleTrendingPress,
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

    setActiveChip("all");
    setFeaturedShortcut("newActivity");
    setDisplayMode("explore");
    setFocusedRegion(pick.region);
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    mapRef.current?.animateToRegion(regionForCountry(pick.latlng, 45), 650);
  }, [
    countries,
    selectCountry,
    setActiveChip,
    setDisplayMode,
    setFeaturedShortcut,
    setFocusedRegion,
  ]);

  const handleRandomCountry = useCallback(async () => {
    if (countries.length === 0) return;

    const ui = useMapUiStore.getState();

    if (zoomTierRef.current === "world") {
      const shortcut = ui.featuredShortcut;
      let pool: MapCountry[] = [];

      if (shortcut === "trending") {
        pool = countries.filter((c) => TRENDING_COUNTRY_NAMES.has(c.name));
      } else if (shortcut === "forYou") {
        useRecentlyViewedStore.getState().seedIfEmpty();
        const names = useRecentlyViewedStore
          .getState()
          .entries.slice(0, 3)
          .map((e) => e.country.name);
        pool = countries.filter((c) => names.includes(c.name));
      } else if (shortcut === "newActivity") {
        const feed = useCountryFeedStore.getState();
        if (feed.countries.length === 0 && feed.status === "idle") {
          await feed.loadInitialFeed();
        }
        const names = feed.countries.slice(0, 3).map((c) => c.name);
        pool = countries.filter((c) => names.includes(c.name));
      }

      if (pool.length === 0) {
        const trending = countries.filter((c) =>
          TRENDING_COUNTRY_NAMES.has(c.name),
        );
        pool = trending.length > 0 ? trending : countries;
      }

      const pick = pool[Math.floor(Math.random() * pool.length)] ?? null;
      if (!pick) return;
      focusByMapCountry(pick);
      return;
    }

    const base = focusedRegion
      ? countries.filter((c) => c.region === focusedRegion)
      : countries;
    const visible = filterMapCountriesByChip(base, activeChip);
    if (visible.length === 0) return;

    const pick = visible[Math.floor(Math.random() * visible.length)] ?? null;
    if (!pick) return;

    selectCountry(pick.name);
    mapRef.current?.animateToRegion(regionForCountry(pick.latlng), 600);
  }, [activeChip, countries, focusByMapCountry, focusedRegion, selectCountry]);

  const bottomPad = Math.max(insets.bottom, 16) + 88;
  const showOnboarding =
    !hasSeenMapOnboarding &&
    zoomTier === "world" &&
    status !== "loading" &&
    countries.length > 0 &&
    selectedCountry === null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <WorldMapView
        ref={mapRef}
        countries={pinCountries}
        clusters={clusters}
        selectedName={selectedCountry?.name ?? null}
        focusedRegion={focusedRegion}
        zoomTier={zoomTier}
        onCountryPress={focusCountry}
        onClusterPress={handleClusterPress}
        onMapPress={() => selectCountry(null)}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View pointerEvents="box-none" className="gap-2">
          <View style={{ paddingTop: insets.top + 8 }}>
            <MapSearchRow />
          </View>
          {zoomTier === "world" ? (
            <MapFeaturedChips
              onTrendingPress={handleTrendingPress}
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

        <MapControls
          onReset={() => {
            mapRef.current?.resetWorldView();
            resetGlobalPulse();
            setZoomTier("world");
            zoomTierRef.current = "world";
            selectCountry(null);
            setActiveChip("all");
          }}
          onZoomIn={() => mapRef.current?.zoomBy("in")}
          onZoomOut={() => mapRef.current?.zoomBy("out")}
        />

        <RandomCountryFab onPress={() => void handleRandomCountry()} />

        {selectedCountry ? (
          <View style={[styles.previewWrap, { bottom: bottomPad }]}>
            <MapCountryPreviewCard
              country={selectedCountry}
              onDismiss={() => selectCountry(null)}
            />
          </View>
        ) : showOnboarding ? (
          <View style={[styles.previewWrap, { bottom: bottomPad }]}>
            <MapOnboardingSheet onDismiss={() => dismissMapOnboarding()} />
          </View>
        ) : null}
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
  previewWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
