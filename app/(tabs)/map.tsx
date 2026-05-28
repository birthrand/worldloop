import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapRegionChrome } from "@/components/map/map-region-chrome";
import { MapSearchRow } from "@/components/map/map-search-row";
import { RandomCountryFab } from "@/components/map/random-country-fab";
import { type MapZoomTier } from "@/components/map/world-map-view";
import {
  regionForClusterFocus,
  regionForMapCountry,
} from "@/constants/map-regions";
import { adjacentContinent, CONTINENTS } from "@/constants/regions";
import { getMapDisplayLatLng } from "@/lib/map-country";
import { buildMapClusters, type MapCluster } from "@/lib/map-clusters";
import { parseCountryBoundaryPolygons } from "@/lib/map-country-boundaries";
import {
  findClusterAtWorldCoordinate,
  type MapPressCoordinate,
} from "@/lib/map-map-tap-hit";
import {
  buildMapRandomPool,
  pickRandomMapCountry,
} from "@/lib/map-random-pick";
import {
  MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
  REGION_FOCUS_INITIAL_DELTA,
} from "@/lib/map-region-markers";
import {
  isGlobeMapUi,
  type MapViewTransition,
} from "@/lib/map-view-transition";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { filterMapCountriesByChip, useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import type { MapCountry } from "@/types/country";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

const TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "transparent",
  borderTopWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
};

const REGION_SWITCH_HYSTERESIS_MS = 200;
const EXPLICIT_REGION_RELEASE_DISTANCE_DEGREES = 22;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<MapCanvasHandle>(null);
  const zoomTierRef = useRef<MapZoomTier>("world");
  const isMapAnimatingRef = useRef(false);
  /** Blocks world-zoom reset while animating into a continent/country focus. */
  const suppressWorldResetRef = useRef(false);
  const mapAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingRegionSwitchTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingRegionCandidateRef = useRef<string | null>(null);
  const explicitRegionLockRef = useRef<{
    region: string;
    anchor: [number, number];
  } | null>(null);

  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const selectedCountry = useMapStore((s) => s.selectedCountry);
  const activeChip = useMapStore((s) => s.activeChip);
  const countries = useMapStore((s) => s.countries);
  const mapMode = useMapStore((s) => s.mapMode);
  const loadMapCountries = useMapStore((s) => s.loadMapCountries);
  const selectCountry = useMapStore((s) => s.selectCountry);
  const setActiveChip = useMapStore((s) => s.setActiveChip);
  const setMapMode = useMapStore((s) => s.setMapMode);
  const focusCountryOnGlobe = useMapStore((s) => s.focusCountryOnGlobe);
  const clearPendingExternalFocus = useMapStore(
    (s) => s.clearPendingExternalFocus,
  );
  const pendingExternalFocusName = useMapStore(
    (s) => s.pendingExternalFocusName,
  );
  const pendingExternalFocusMode = useMapStore(
    (s) => s.pendingExternalFocusMode,
  );

  const focusedRegion = useMapUiStore((s) => s.focusedRegion);
  const spotlightCountryName = useMapUiStore((s) => s.spotlightCountryName);
  const setDisplayMode = useMapUiStore((s) => s.setDisplayMode);
  const setFocusedRegion = useMapUiStore((s) => s.setFocusedRegion);
  const setFeaturedShortcut = useMapUiStore((s) => s.setFeaturedShortcut);
  const setSpotlightCountry = useMapUiStore((s) => s.setSpotlightCountry);
  const resetGlobalPulse = useMapUiStore((s) => s.resetGlobalPulse);
  const hasSeenMapOnboarding = useMapUiStore((s) => s.hasSeenMapOnboarding);
  const dismissMapOnboarding = useMapUiStore((s) => s.dismissMapOnboarding);
  const countryMarkerMode = useMapUiStore((s) => s.countryMarkerMode);

  const [zoomTier, setZoomTier] = useState<MapZoomTier>("world");
  const [mapViewTransition, setMapViewTransition] =
    useState<MapViewTransition>("idle");
  const [isNextCountryLoading, setIsNextCountryLoading] = useState(false);
  const [hasRegionZoomStarted, setHasRegionZoomStarted] = useState(false);
  const is3d = isGlobeMapUi(mapMode, mapViewTransition);

  const handleMapModeToggle = useCallback(() => {
    if (mapMode === "3d") {
      setMapViewTransition("enteringFlat");
      return;
    }
    setMapMode("3d");
    setMapViewTransition("enteringGlobe");
  }, [mapMode, setMapMode]);

  const handleGlobeTransitionComplete = useCallback(() => {
    setMapViewTransition("ready");
  }, []);

  const handleFlatTransitionComplete = useCallback(() => {
    setMapMode("2d");
    setMapViewTransition("idle");
  }, [setMapMode]);
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  const clusters = useMemo(() => buildMapClusters(countries), [countries]);

  const navigableContinents = useMemo(
    () => CONTINENTS.filter((region) => clusters.some((c) => c.region === region)),
    [clusters],
  );

  const allBoundaryPolygons = useMemo(
    () => parseCountryBoundaryPolygons(countriesGeoJson),
    [],
  );

  const pinCountries = useMemo(() => {
    if (spotlightCountryName) {
      const spotlight =
        countries.find((c) => c.name === spotlightCountryName) ?? null;
      return spotlight ? [spotlight] : [];
    }

    if (!focusedRegion) {
      if (is3d) {
        const pinName =
          spotlightCountryName ?? selectedCountry?.name ?? null;
        if (!pinName) return [];
        const pin = countries.find((c) => c.name === pinName) ?? null;
        return pin ? [pin] : [];
      }
      return [];
    }

    const base = countries.filter((c) => c.region === focusedRegion);
    const visible = filterMapCountriesByChip(base, activeChip);

    // Region scope: show all visible countries immediately on region entry.
    const effectiveTier = is3d ? "region" : zoomTier;
    if (effectiveTier === "country" || hasRegionZoomStarted) {
      return visible;
    }
    return visible;
  }, [
    activeChip,
    countries,
    focusedRegion,
    hasRegionZoomStarted,
    is3d,
    selectedCountry?.name,
    spotlightCountryName,
    zoomTier,
  ]);

  const mapMarkerCountries = useMemo(() => {
    if (!spotlightCountryName) return pinCountries;
    return pinCountries.filter((c) => c.name === spotlightCountryName);
  }, [pinCountries, spotlightCountryName]);

  const highlightedCountryName =
    selectedCountry?.name ?? spotlightCountryName ?? null;

  const isPreviewOpen = selectedCountry !== null;

  useLayoutEffect(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.setOptions({
      tabBarStyle: isPreviewOpen ? { display: "none" } : TAB_BAR_STYLE,
    });
  }, [isPreviewOpen, navigation]);

  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
    };
  }, [navigation]);

  useEffect(() => {
    if (status === "idle" && countries.length === 0) {
      void loadMapCountries();
    }
  }, [status, countries.length, loadMapCountries]);

  useEffect(() => {
    if (!focusedRegion) {
      setHasRegionZoomStarted(false);
    }
  }, [focusedRegion]);

  const focusGlobeCountry = useCallback(
    (pick: MapCountry, duration = 650) => {
      selectCountry(pick.name);
      focusCountryOnGlobe(pick.name, duration);
    },
    [focusCountryOnGlobe, selectCountry],
  );

  const computeZoomTier = useCallback((latitudeDelta: number): MapZoomTier => {
    if (latitudeDelta > 60) return "world";
    if (latitudeDelta > MAP_COUNTRY_ZOOM_LATITUDE_DELTA) return "region";
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

  const clearPendingRegionSwitch = useCallback(() => {
    if (pendingRegionSwitchTimerRef.current) {
      clearTimeout(pendingRegionSwitchTimerRef.current);
      pendingRegionSwitchTimerRef.current = null;
    }
    pendingRegionCandidateRef.current = null;
  }, []);

  const lockExplicitRegion = useCallback(
    (region: string, anchor: [number, number]) => {
      explicitRegionLockRef.current = { region, anchor };
      clearPendingRegionSwitch();
    },
    [clearPendingRegionSwitch],
  );

  const clearExplicitRegionLock = useCallback(() => {
    explicitRegionLockRef.current = null;
    clearPendingRegionSwitch();
  }, [clearPendingRegionSwitch]);

  const resolveNearestRegionByCenter = useCallback(
    (region: Region): string | null => {
      if (clusters.length === 0) return null;

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

      return nearest?.region ?? null;
    },
    [clusters],
  );

  useEffect(() => {
    return () => {
      clearPendingRegionSwitch();
      if (mapAnimationTimerRef.current) {
        clearTimeout(mapAnimationTimerRef.current);
      }
    };
  }, [clearPendingRegionSwitch]);

  const focusCountry = useCallback(
    (country: MapCountry) => {
      if (spotlightCountryName) {
        selectCountry(country.name);
        if (is3d) {
          focusCountryOnGlobe(country.name, 450);
        } else {
          animateMapToRegion(regionForMapCountry(country), 500);
        }
        return;
      }

      if (is3d) {
        focusGlobeCountry(country, 450);
        return;
      }
      selectCountry(country.name);
      animateMapToRegion(regionForMapCountry(country), 500);
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
      lockExplicitRegion(cluster.region, cluster.center);
      setHasRegionZoomStarted(false);
      zoomTierRef.current = "region";
      setZoomTier("region");

      if (is3d) {
        const [lat, lng] = cluster.center;
        useMapStore.getState().focusLatLngOnGlobe(lat, lng, 650);
        return;
      }

      animateMapToRegion(regionForClusterFocus(cluster), 650);
    },
    [
      animateMapToRegion,
      is3d,
      selectCountry,
      setDisplayMode,
      setFocusedRegion,
      setFeaturedShortcut,
      setHasRegionZoomStarted,
      lockExplicitRegion,
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

      // Release post-focus guard once interaction has settled on non-world zoom.
      // Without this, zooming back out can keep region scope latched.
      if (suppressWorldResetRef.current && nextTier !== "world") {
        suppressWorldResetRef.current = false;
      }

      if (zoomTierRef.current !== nextTier) {
        zoomTierRef.current = nextTier;
        setZoomTier(nextTier);
      }

      if (nextTier === "world") {
        clearPendingRegionSwitch();
        if (!suppressWorldResetRef.current) {
          clearExplicitRegionLock();
          resetGlobalPulse();
          selectCountry(null);
          setSpotlightCountry(null);
          setHasRegionZoomStarted(false);
        }
        return;
      }

      suppressWorldResetRef.current = false;
      setDisplayMode("explore");

      const currentFocused = useMapUiStore.getState().focusedRegion;
      if (currentFocused && region.latitudeDelta < REGION_FOCUS_INITIAL_DELTA) {
        setHasRegionZoomStarted(true);
      }

      const nearestRegion = resolveNearestRegionByCenter(region);
      if (!nearestRegion) {
        clearPendingRegionSwitch();
        return;
      }

      const explicitLock = explicitRegionLockRef.current;
      if (explicitLock && nearestRegion !== explicitLock.region) {
        const dLat = region.latitude - explicitLock.anchor[0];
        const dLng = region.longitude - explicitLock.anchor[1];
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);
        if (distance < EXPLICIT_REGION_RELEASE_DISTANCE_DEGREES) {
          clearPendingRegionSwitch();
          return;
        }
        explicitRegionLockRef.current = null;
      }

      if (nearestRegion === currentFocused) {
        clearPendingRegionSwitch();
        return;
      }

      if (pendingRegionCandidateRef.current === nearestRegion) {
        return;
      }

      clearPendingRegionSwitch();
      pendingRegionCandidateRef.current = nearestRegion;
      pendingRegionSwitchTimerRef.current = setTimeout(() => {
        if (
          zoomTierRef.current === "world" ||
          pendingRegionCandidateRef.current !== nearestRegion
        ) {
          return;
        }
        setFocusedRegion(nearestRegion);
        setHasRegionZoomStarted(false);
        pendingRegionCandidateRef.current = null;
        pendingRegionSwitchTimerRef.current = null;
      }, REGION_SWITCH_HYSTERESIS_MS);
    },
    [
      clearExplicitRegionLock,
      clearPendingRegionSwitch,
      computeZoomTier,
      is3d,
      resetGlobalPulse,
      resolveNearestRegionByCenter,
      selectCountry,
      setDisplayMode,
      setFocusedRegion,
      setHasRegionZoomStarted,
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
      lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));
      setHasRegionZoomStarted(false);
      zoomTierRef.current = "region";
      setZoomTier("region");
      animateMapToRegion(
        regionForMapCountry(pick, REGION_FOCUS_INITIAL_DELTA),
        duration,
      );
    },
    [
      animateMapToRegion,
      focusCountryOnGlobe,
      is3d,
      lockExplicitRegion,
      setDisplayMode,
      setFocusedRegion,
      setHasRegionZoomStarted,
    ],
  );

  const applyPendingExternalMapFocus = useCallback(() => {
    const { pendingExternalFocusName: pendingName, pendingExternalFocusMode } =
      useMapStore.getState();
    if (!pendingName || countries.length === 0) return;

    const pick = countries.find((c) => c.name === pendingName) ?? null;
    if (!pick) return;

    if (pendingExternalFocusMode === "spotlight") {
      selectCountry(null);
      setSpotlightCountry(pick.name);
      setActiveChip("all");
      setFeaturedShortcut(null);
      flyMapToCountry(pick, 650);
    } else {
      setSpotlightCountry(null);
      selectCountry(pick.name);
      flyMapToCountry(pick, 650);
    }

    // Globe camera registers after first paint in 3D — leave pending until then.
    if (!is3d || useMapStore.getState().globeCamera) {
      clearPendingExternalFocus();
    }
  }, [
    clearPendingExternalFocus,
    countries,
    flyMapToCountry,
    is3d,
    selectCountry,
    setActiveChip,
    setFeaturedShortcut,
    setSpotlightCountry,
  ]);

  useFocusEffect(
    useCallback(() => {
      applyPendingExternalMapFocus();
    }, [applyPendingExternalMapFocus]),
  );

  useEffect(() => {
    if (pendingExternalFocusName && countries.length > 0) {
      applyPendingExternalMapFocus();
    }
  }, [
    applyPendingExternalMapFocus,
    countries.length,
    pendingExternalFocusName,
  ]);

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
    },
    [flyMapToCountry, selectCountry, setSpotlightCountry],
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
    lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    animateMapToRegion(regionForMapCountry(pick, 45), 650);
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
    lockExplicitRegion,
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
    lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));
    zoomTierRef.current = "region";
    setZoomTier("region");
    selectCountry(pick.name);
    animateMapToRegion(regionForMapCountry(pick, 45), 650);
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
    lockExplicitRegion,
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
    clearExplicitRegionLock();
    mapRef.current?.resetWorldView();
    resetGlobalPulse();
    setZoomTier("world");
    zoomTierRef.current = "world";
    selectCountry(null);
    setSpotlightCountry(null);
    setHasRegionZoomStarted(false);
    setActiveChip("all");
  }, [
    clearExplicitRegionLock,
    resetGlobalPulse,
    selectCountry,
    setActiveChip,
    setHasRegionZoomStarted,
    setSpotlightCountry,
  ]);

  const handleBackToWorld = useCallback(() => {
    suppressWorldResetRef.current = false;
    clearExplicitRegionLock();
    mapRef.current?.resetWorldView();
    resetGlobalPulse();
    setZoomTier("world");
    zoomTierRef.current = "world";
    selectCountry(null);
    setSpotlightCountry(null);
    setHasRegionZoomStarted(false);
  }, [
    clearExplicitRegionLock,
    resetGlobalPulse,
    selectCountry,
    setHasRegionZoomStarted,
    setSpotlightCountry,
  ]);

  const handleBackToContinent = useCallback(() => {
    if (!focusedRegion) return;

    const cluster = clusters.find((c) => c.region === focusedRegion);
    if (!cluster) return;

    handleClusterPress(cluster);
  }, [clusters, focusedRegion, handleClusterPress]);

  const navigateContinent = useCallback(
    (direction: "prev" | "next") => {
      if (!focusedRegion || navigableContinents.length === 0) return;

      const nextRegion = adjacentContinent(
        focusedRegion,
        direction,
        navigableContinents,
      );
      if (!nextRegion || nextRegion === focusedRegion) return;

      const cluster = clusters.find((c) => c.region === nextRegion);
      if (!cluster) return;

      handleClusterPress(cluster);
    },
    [clusters, focusedRegion, handleClusterPress, navigableContinents],
  );

  const handlePreviousContinent = useCallback(() => {
    navigateContinent("prev");
  }, [navigateContinent]);

  const handleNextContinent = useCallback(() => {
    navigateContinent("next");
  }, [navigateContinent]);

  const dismissPreview = useCallback(() => {
    selectCountry(null);
  }, [selectCountry]);

  const deselectCountry = useCallback(() => {
    suppressWorldResetRef.current = false;
    clearExplicitRegionLock();
    selectCountry(null);
    setSpotlightCountry(null);
    setHasRegionZoomStarted(false);
    resetGlobalPulse();
  }, [
    clearExplicitRegionLock,
    resetGlobalPulse,
    selectCountry,
    setHasRegionZoomStarted,
    setSpotlightCountry,
  ]);

  const handleMapPress = useCallback(
    (coordinate?: MapPressCoordinate) => {
      if (selectedCountry) {
        dismissPreview();
        return;
      }

      if (
        coordinate &&
        !focusedRegion &&
        (is3d || zoomTierRef.current === "world")
      ) {
        const cluster = findClusterAtWorldCoordinate(
          allBoundaryPolygons,
          countries,
          clusters,
          coordinate,
        );
        if (cluster) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleClusterPress(cluster);
          return;
        }
      }

      if (!spotlightCountryName && !focusedRegion) {
        return;
      }

      deselectCountry();
    },
    [
      allBoundaryPolygons,
      clusters,
      countries,
      deselectCountry,
      dismissPreview,
      focusedRegion,
      handleClusterPress,
      is3d,
      selectedCountry,
      spotlightCountryName,
    ],
  );

  const bottomPad = isPreviewOpen
    ? Math.max(insets.bottom, 16) + 16
    : Math.max(insets.bottom, 16) + 88;
  const showOnboarding =
    !hasSeenMapOnboarding &&
    (is3d || zoomTier === "world") &&
    status !== "loading" &&
    countries.length > 0 &&
    selectedCountry === null &&
    spotlightCountryName === null;

  const showRegionChrome = !isPreviewOpen && !!focusedRegion;
  const showFlagToggle = mapMarkerCountries.length > 0;

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const randomFabBottom = showRegionChrome
    ? regionChromeBottom + 100
    : regionChromeBottom + 88;

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
        countryMarkerMode={countryMarkerMode}
        mapViewTransition={mapViewTransition}
        onGlobeTransitionComplete={handleGlobeTransitionComplete}
        onFlatTransitionComplete={handleFlatTransitionComplete}
        lockUserGestures={isPreviewOpen}
        onCountryPress={focusCountry}
        onClusterPress={handleClusterPress}
        onMapPress={handleMapPress}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {isPreviewOpen ? (
          <View style={styles.previewDim} pointerEvents="none" />
        ) : null}

        {!isPreviewOpen ? (
          <View
            pointerEvents="box-none"
            className="gap-2"
            style={{ paddingTop: insets.top + 8 }}
          >
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
        ) : null}

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

        {selectedCountry ? (
          <View
            style={[styles.previewWrap, { bottom: bottomPad }]}
            pointerEvents="box-none"
          >
            <MapCountryPreviewCard
              country={selectedCountry}
              onDismiss={dismissPreview}
              onNextCountry={() => void handleNextCountry()}
              isNextCountryLoading={isNextCountryLoading}
            />
          </View>
        ) : showOnboarding ? (
          <View style={[styles.previewWrap, { bottom: bottomPad }]}>
            <MapOnboardingSheet onDismiss={() => dismissMapOnboarding()} />
          </View>
        ) : null}

        {showRegionChrome && focusedRegion ? (
          <MapRegionChrome
            focusedRegion={focusedRegion}
            bottom={Math.max(insets.bottom, 16)}
            onContinentPress={handleBackToContinent}
            onPreviousContinent={handlePreviousContinent}
            onNextContinent={handleNextContinent}
            onWorldPress={handleBackToWorld}
          />
        ) : null}

        {!isPreviewOpen ? (
          <>
            <MapControls
              mapMode={mapMode}
              mapViewTransition={mapViewTransition}
              onMapModeToggle={handleMapModeToggle}
              onReset={handleReset}
              onZoomIn={() => mapRef.current?.zoomBy("in")}
              onZoomOut={() => mapRef.current?.zoomBy("out")}
              showFlagToggle={showFlagToggle}
              showBoundaryControls
            />

            <RandomCountryFab
              bottom={randomFabBottom}
              onPress={() => void handleRandomCountry()}
            />
          </>
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
  previewDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.45)",
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
