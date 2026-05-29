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

import { type GlobeCameraViewState } from "@/components/map/globe-view";
import { MapCanvas, type MapCanvasHandle } from "@/components/map/map-canvas";
import { MapControls } from "@/components/map/map-controls";
import { MapCountryFocusPill } from "@/components/map/map-country-focus-pill";
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapRandomCountryHint } from "@/components/map/map-random-country-hint";
import { MapRegionChrome } from "@/components/map/map-region-chrome";
import { MapSearchRow } from "@/components/map/map-search-row";
import { RandomCountryFab } from "@/components/map/random-country-fab";
import { type MapZoomTier } from "@/components/map/world-map-view";
import {
  regionForClusterFocus,
  regionForMapCountry,
  WORLD_INITIAL_REGION,
} from "@/constants/map-regions";
import { continentDisplayLabel } from "@/constants/regions";
import { useContinentIntent } from "@/hooks/use-continent-intent";
import { useMapMarkerReveal } from "@/hooks/use-map-marker-reveal";
import { buildMapClusters, type MapCluster } from "@/lib/map-clusters";
import { getMapDisplayLatLng } from "@/lib/map-country";
import { parseCountryBoundaryPolygons } from "@/lib/map-country-boundaries";
import {
  findClusterAtWorldCoordinate,
  type MapPressCoordinate,
} from "@/lib/map-map-tap-hit";
import {
  buildMapRandomPool,
  pickRandomMapCountry,
} from "@/lib/map-random-pick";
import { selectCountryOnMap } from "@/lib/map-country-selection";
import { syncMapRegionFocusForCountry } from "@/lib/map-region-focus";
import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
  MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
  REGION_FOCUS_INITIAL_DELTA,
  resolveRegionMarkerCountries,
} from "@/lib/map-region-markers";
import {
  isGlobeMapUi,
  type MapViewTransition,
} from "@/lib/map-view-transition";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useExperienceStore } from "@/store/use-experience-store";
import {
  useIdentityStore,
  type SelectionSource,
} from "@/store/use-identity-store";
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
  const [isMapAnimating, setIsMapAnimating] = useState(false);
  /** Guards the FAB so a rapid second tap can't fire an overlapping camera flight. */
  const randomPickBusyRef = useRef(false);
  const mapMarkerCountriesRef = useRef<MapCountry[]>([]);
  const frozenMapMarkersRef = useRef<MapCountry[] | null>(null);
  const [markerRefreshToken, setMarkerRefreshToken] = useState(0);
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
  const pendingGlobeFocusNameRef = useRef<string | null>(null);
  /** Country whose camera flight is in progress — pulse only during this window. */
  const pendingActiveCountryRef = useRef<string | null>(null);
  /** Continent to center on the globe after 2D → 3D when no country is selected. */
  const pendingGlobeRegionFocusRef = useRef<string | null>(null);
  /** Country to focus on the 2D map after 3D → 2D crossfade completes. */
  const pendingFlatFocusNameRef = useRef<string | null>(null);
  /** When true, preview dismiss returns to continent zoom instead of world. */
  const [previewDismissToContinent, setPreviewDismissToContinent] =
    useState(false);
  const [tapRippleAt, setTapRippleAt] = useState<MapPressCoordinate | null>(
    null,
  );
  const [tapRippleToken, setTapRippleToken] = useState(0);
  const [focusTransitionCountryName, setFocusTransitionCountryName] = useState<
    string | null
  >(null);
  /** Bottom preview sheet — separate from map selection / pin highlight. */
  const [previewCountryName, setPreviewCountryName] = useState<string | null>(
    null,
  );
  const [randomCountryHint, setRandomCountryHint] = useState<MapCountry | null>(
    null,
  );

  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const activeCountry = useIdentityStore((s) => s.activeCountry);
  const clearActiveCountry = useIdentityStore((s) => s.clearActiveCountry);
  const activeChip = useMapStore((s) => s.activeChip);
  const countries = useMapStore((s) => s.countries);
  const mapMode = useMapStore((s) => s.mapMode);
  const loadMapCountries = useMapStore((s) => s.loadMapCountries);
  const setActiveChip = useMapStore((s) => s.setActiveChip);
  const setMapMode = useMapStore((s) => s.setMapMode);
  const focusCountryOnGlobe = useMapStore((s) => s.focusCountryOnGlobe);
  const focusLatLngOnGlobe = useMapStore((s) => s.focusLatLngOnGlobe);
  const clearPendingExternalFocus = useMapStore(
    (s) => s.clearPendingExternalFocus,
  );
  const pendingExternalFocusName = useMapStore(
    (s) => s.pendingExternalFocusName,
  );
  const globeCamera = useMapStore((s) => s.globeCamera);

  const pulsing = useExperienceStore((s) => s.pulsing);
  const endExperienceTransition = useExperienceStore((s) => s.endTransition);
  const resetExperience = useExperienceStore((s) => s.resetExperience);
  const setPreviewOpen = useExperienceStore((s) => s.setPreviewOpen);

  const focusedRegion = useMapUiStore((s) => s.focusedRegion);
  const setDisplayMode = useMapUiStore((s) => s.setDisplayMode);
  const setFocusedRegion = useMapUiStore((s) => s.setFocusedRegion);
  const setFeaturedShortcut = useMapUiStore((s) => s.setFeaturedShortcut);
  const resetGlobalPulse = useMapUiStore((s) => s.resetGlobalPulse);
  const hasSeenMapOnboarding = useMapUiStore((s) => s.hasSeenMapOnboarding);
  const hasSeenRandomCountryHint = useMapUiStore(
    (s) => s.hasSeenRandomCountryHint,
  );
  const dismissMapOnboarding = useMapUiStore((s) => s.dismissMapOnboarding);
  const dismissRandomCountryHint = useMapUiStore(
    (s) => s.dismissRandomCountryHint,
  );
  const countryMarkerMode = useMapUiStore((s) => s.countryMarkerMode);

  const [zoomTier, setZoomTier] = useState<MapZoomTier>("world");
  const [mapViewTransition, setMapViewTransition] =
    useState<MapViewTransition>("idle");
  const [isNextCountryLoading, setIsNextCountryLoading] = useState(false);
  const [hasRegionZoomStarted, setHasRegionZoomStarted] = useState(false);
  const [globeCameraDistance, setGlobeCameraDistance] = useState(
    GLOBE_DETAIL_CAMERA_DISTANCE + 2,
  );
  const [globeViewCenter, setGlobeViewCenter] = useState({
    latitude: 0,
    longitude: -30,
  });
  const [lastMapRegion, setLastMapRegion] = useState(WORLD_INITIAL_REGION);
  const is3d = isGlobeMapUi(mapMode, mapViewTransition);

  useEffect(() => {
    if (pendingExternalFocusName && !is3d) {
      setIsMapAnimating(true);
    }
  }, [is3d, pendingExternalFocusName]);

  const handleGlobeTransitionComplete = useCallback(() => {
    setMapViewTransition("ready");
  }, []);
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  const clusters = useMemo(() => buildMapClusters(countries), [countries]);

  const allBoundaryPolygons = useMemo(
    () => parseCountryBoundaryPolygons(countriesGeoJson),
    [],
  );

  const activeCountryName = activeCountry?.name ?? null;

  const pinCountries = useMemo(() => {
    if (!focusedRegion) {
      if (is3d) {
        if (!activeCountryName) return [];
        const pin =
          countries.find((c) => c.name === activeCountryName) ?? null;
        return pin ? [pin] : [];
      }
      return [];
    }

    const base = countries.filter((c) => c.region === focusedRegion);
    const visible = filterMapCountriesByChip(base, activeChip);

    const isDetailZoom = is3d
      ? globeCameraDistance <= GLOBE_DETAIL_CAMERA_DISTANCE
      : zoomTier === "country" ||
        hasRegionZoomStarted ||
        activeCountryName !== null;

    const showAllRegionMarkers =
      isDetailZoom || (pulsing && !!activeCountryName);

    return showAllRegionMarkers
      ? visible
      : resolveRegionMarkerCountries(visible, false);
  }, [
    activeChip,
    activeCountryName,
    countries,
    focusedRegion,
    globeCameraDistance,
    hasRegionZoomStarted,
    is3d,
    pulsing,
    zoomTier,
  ]);

  const isDetailZoom = is3d
    ? globeCameraDistance <= GLOBE_DETAIL_CAMERA_DISTANCE
    : zoomTier === "country" ||
      hasRegionZoomStarted ||
      activeCountryName !== null;

  const markerViewportCenter = useMemo(() => {
    if (!is3d) {
      return {
        latitude: lastMapRegion.latitude,
        longitude: lastMapRegion.longitude,
      };
    }

    const cluster = focusedRegion
      ? (clusters.find((c) => c.region === focusedRegion) ?? null)
      : null;

    // Stable anchor at continent zoom — globe rotation must not reshuffle markers.
    if (cluster && globeCameraDistance > GLOBE_DETAIL_CAMERA_DISTANCE) {
      return {
        latitude: cluster.center[0],
        longitude: cluster.center[1],
      };
    }

    return globeViewCenter;
  }, [
    clusters,
    focusedRegion,
    globeCameraDistance,
    globeViewCenter,
    is3d,
    lastMapRegion.latitude,
    lastMapRegion.longitude,
  ]);

  const markerReveal = useMapMarkerReveal({
    candidateCountries: pinCountries,
    viewportCenter: markerViewportCenter,
    focusedRegion,
    isDetailZoom,
    enabled: !!focusedRegion,
    suspendReveal: isMapAnimating,
  });

  const mapMarkerCountries = markerReveal.countriesToRender;

  mapMarkerCountriesRef.current = mapMarkerCountries;

  const mapMarkersForCanvas =
    isMapAnimating && frozenMapMarkersRef.current
      ? frozenMapMarkersRef.current
      : mapMarkerCountries;

  const selectedMapName = activeCountryName;

  const isPreviewOpen =
    previewCountryName !== null &&
    previewCountryName === activeCountry?.name;

  useEffect(() => {
    setPreviewOpen(isPreviewOpen);
  }, [isPreviewOpen, setPreviewOpen]);

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

  useEffect(() => {
    // After 2D → 3D, pan once the globe is interactive and the camera handle exists.
    // Keep pending until focus succeeds — clearing early caused a no-op when the
    // camera registered a frame after transition became "ready".
    if (mapMode !== "3d" || mapViewTransition !== "ready" || !globeCamera) {
      return;
    }

    const focusName = pendingGlobeFocusNameRef.current;
    if (focusName) {
      focusCountryOnGlobe(focusName, 900);
      pendingGlobeFocusNameRef.current = null;
      pendingGlobeRegionFocusRef.current = null;
      return;
    }

    const focusRegion = pendingGlobeRegionFocusRef.current;
    if (!focusRegion) {
      return;
    }

    const cluster = clusters.find((c) => c.region === focusRegion);
    pendingGlobeRegionFocusRef.current = null;
    if (!cluster) {
      return;
    }

    const [lat, lng] = cluster.center;
    focusLatLngOnGlobe(lat, lng, 900);
  }, [
    clusters,
    focusCountryOnGlobe,
    focusLatLngOnGlobe,
    globeCamera,
    mapMode,
    mapViewTransition,
  ]);

  const computeZoomTier = useCallback((latitudeDelta: number): MapZoomTier => {
    if (latitudeDelta > 60) return "world";
    if (latitudeDelta > MAP_COUNTRY_ZOOM_LATITUDE_DELTA) return "region";
    return "country";
  }, []);

  /** Country preview + full region markers — not blocked by programmatic flight guards. */
  const enterCountryDetailMode = useCallback(() => {
    zoomTierRef.current = "country";
    setZoomTier("country");
    setHasRegionZoomStarted(true);
  }, []);

  const beginProgrammaticMapFlight = useCallback(
    (duration: number) => {
      // Overlapping camera flights crash iOS react-native-maps (no JS error).
      if (isMapAnimatingRef.current) return;

      frozenMapMarkersRef.current = mapMarkerCountriesRef.current;
      isMapAnimatingRef.current = true;
      setIsMapAnimating(true);
      if (mapAnimationTimerRef.current) {
        clearTimeout(mapAnimationTimerRef.current);
      }
      mapAnimationTimerRef.current = setTimeout(() => {
        isMapAnimatingRef.current = false;
        frozenMapMarkersRef.current = null;
        setIsMapAnimating(false);
        setMarkerRefreshToken((token) => token + 1);
        mapAnimationTimerRef.current = null;

        pendingActiveCountryRef.current = null;
        setFocusTransitionCountryName(null);
        endExperienceTransition();
      }, duration + 300);
    },
    [endExperienceTransition],
  );

  const startCountryFocusTransition = useCallback(
    (countryName: string, duration: number) => {
      pendingActiveCountryRef.current = countryName;
      setFocusTransitionCountryName(countryName);
      beginProgrammaticMapFlight(duration);
    },
    [beginProgrammaticMapFlight],
  );

  const animateMapToRegionOnly = useCallback((region: Region, duration = 500) => {
    mapRef.current?.animateToRegion(region, duration);
  }, []);

  const animateMapToRegion = useCallback(
    (region: Region, duration = 500) => {
      if (isMapAnimatingRef.current) return;
      beginProgrammaticMapFlight(duration);
      animateMapToRegionOnly(region, duration);
    },
    [animateMapToRegionOnly, beginProgrammaticMapFlight],
  );

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

  const syncRegionFocusForCountry = useCallback(
    (pick: MapCountry) => {
      syncMapRegionFocusForCountry(pick);
      lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));
      suppressWorldResetRef.current = true;
    },
    [lockExplicitRegion],
  );

  const clearFocusTransition = useCallback(() => {
    pendingActiveCountryRef.current = null;
    setFocusTransitionCountryName(null);
  }, []);

  const clearCountrySelection = useCallback(() => {
    setPreviewCountryName(null);
    clearFocusTransition();
    clearActiveCountry();
    resetExperience();
  }, [clearActiveCountry, clearFocusTransition, resetExperience]);

  const resolveNearestRegionByLatLng = useCallback(
    (centerLat: number, centerLng: number): string | null => {
      if (clusters.length === 0) return null;

      let nearest: MapCluster | null = null;
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

  const resolveNearestRegionByCenter = useCallback(
    (region: Region): string | null =>
      resolveNearestRegionByLatLng(region.latitude, region.longitude),
    [resolveNearestRegionByLatLng],
  );

  useEffect(() => {
    return () => {
      clearPendingRegionSwitch();
      if (mapAnimationTimerRef.current) {
        clearTimeout(mapAnimationTimerRef.current);
      }
    };
  }, [clearPendingRegionSwitch]);

  const commitClusterFocus = useCallback(
    (cluster: MapCluster) => {
      clearPendingRegionSwitch();
      clearCountrySelection();
      setFeaturedShortcut(null);
      setDisplayMode("explore");
      suppressWorldResetRef.current = true;
      setFocusedRegion(cluster.region);
      lockExplicitRegion(cluster.region, cluster.center);
      setHasRegionZoomStarted(false);
      zoomTierRef.current = "region";
      setZoomTier("region");

      const focusRegion = regionForClusterFocus(cluster);
      setLastMapRegion(focusRegion);

      if (is3d) {
        const [lat, lng] = cluster.center;
        useMapStore.getState().focusLatLngOnGlobe(lat, lng, 650);
        return;
      }

      animateMapToRegion(focusRegion, 650);
    },
    [
      animateMapToRegion,
      clearCountrySelection,
      clearPendingRegionSwitch,
      is3d,
      setDisplayMode,
      setFocusedRegion,
      setFeaturedShortcut,
      setHasRegionZoomStarted,
      lockExplicitRegion,
    ],
  );

  const { previewRegion, requestContinentFocus, cancelIntent } =
    useContinentIntent({
      onCommit: commitClusterFocus,
      focusedRegion,
    });

  const animateCountryFocus = useCallback(
    (
      pick: MapCountry,
      source: Exclude<SelectionSource, null>,
      durationOverride?: number,
    ) => {
      const baseDuration =
        durationOverride ??
        (source === "mapTap" ? (is3d ? 450 : 500) : 650);
      const flightDuration = is3d ? Math.max(baseDuration, 1100) : baseDuration;
      startCountryFocusTransition(pick.name, flightDuration);

      if (is3d) {
        setHasRegionZoomStarted(true);
        focusCountryOnGlobe(pick.name, flightDuration);
      } else {
        enterCountryDetailMode();
        animateMapToRegionOnly(regionForMapCountry(pick), flightDuration);
      }
    },
    [
      animateMapToRegionOnly,
      enterCountryDetailMode,
      focusCountryOnGlobe,
      is3d,
      setHasRegionZoomStarted,
      startCountryFocusTransition,
    ],
  );

  const focusCountryOnMap = useCallback(
    (
      pick: MapCountry,
      source: Exclude<SelectionSource, null> = "mapTap",
      options?: { animate?: boolean },
    ) => {
      if (isMapAnimatingRef.current) return;

      cancelIntent();
      setPreviewDismissToContinent(
        !!useMapUiStore.getState().focusedRegion,
      );

      setDisplayMode("explore");
      syncRegionFocusForCountry(pick);
      selectCountryOnMap(pick, source);

      if (options?.animate !== false) {
        animateCountryFocus(pick, source);
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [
      animateCountryFocus,
      cancelIntent,
      setDisplayMode,
      syncRegionFocusForCountry,
    ],
  );

  const openCountryPreview = useCallback((pick: MapCountry) => {
    setPreviewCountryName(pick.name);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const advanceToCountryPreview = useCallback(
    (
      pick: MapCountry,
      source: Exclude<SelectionSource, null> = "shuffle",
    ) => {
      if (isMapAnimatingRef.current) return;

      cancelIntent();
      setDisplayMode("explore");
      syncRegionFocusForCountry(pick);
      selectCountryOnMap(pick, source);
      setPreviewCountryName(pick.name);
      animateCountryFocus(pick, source);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [
      animateCountryFocus,
      cancelIntent,
      setDisplayMode,
      syncRegionFocusForCountry,
    ],
  );

  const clearCountryFocus = useCallback(() => {
    setPreviewCountryName(null);
    clearFocusTransition();
    clearActiveCountry();
    resetExperience();
  }, [clearActiveCountry, clearFocusTransition, resetExperience]);

  const showTapRipple = useCallback((coordinate: MapPressCoordinate) => {
    setTapRippleAt(coordinate);
    setTapRippleToken((token) => token + 1);
  }, []);

  const handleMapModeToggle = useCallback(() => {
    cancelIntent();
    if (mapMode === "3d") {
      pendingFlatFocusNameRef.current =
        activeCountryName ?? focusTransitionCountryName ?? null;
      pendingGlobeFocusNameRef.current = null;
      pendingGlobeRegionFocusRef.current = null;
      setMapMode("2d");
      setMapViewTransition("enteringFlat");
      return;
    }

    const countryFocus = activeCountryName ?? focusTransitionCountryName ?? null;
    pendingGlobeFocusNameRef.current = countryFocus;
    pendingGlobeRegionFocusRef.current =
      countryFocus || !focusedRegion ? null : focusedRegion;

    setMapMode("3d");
    setMapViewTransition("enteringGlobe");
  }, [
    activeCountryName,
    cancelIntent,
    focusTransitionCountryName,
    focusedRegion,
    mapMode,
    setMapMode,
  ]);

  /** Globe camera updates zoom/detail only — continent exploration stays in UI store until explicit exit. */
  const handleGlobeCameraViewChange = useCallback(
    (state: GlobeCameraViewState) => {
      // Globe may still mount during crossfade — ignore camera ticks unless 3D is active.
      if (mapMode !== "3d" || mapViewTransition !== "ready") {
        return;
      }

      setGlobeCameraDistance((prev) => {
        if (Math.abs(prev - state.distance) < 0.06) return prev;
        return state.distance;
      });

      setGlobeViewCenter((prev) => {
        const dLat = Math.abs(prev.latitude - state.centerLat);
        const dLng = Math.abs(prev.longitude - state.centerLng);
        if (dLat < 2 && dLng < 2) return prev;
        return {
          latitude: state.centerLat,
          longitude: state.centerLng,
        };
      });

      if (
        useMapUiStore.getState().focusedRegion &&
        state.zoomTier === "country"
      ) {
        setHasRegionZoomStarted(true);
      }
    },
    [mapMode, mapViewTransition, setHasRegionZoomStarted],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      // Programmatic fly-to (continent recenter, country focus) fires many region
      // updates — skip viewport writes or marker reveal restarts in a tight loop.
      if (!isMapAnimatingRef.current) {
        setLastMapRegion(region);
      }
      if (is3d) return;

      const nextTier = computeZoomTier(region.latitudeDelta);
      const currentFocused = useMapUiStore.getState().focusedRegion;

      // Keep zoom tier in sync even during programmatic flights (selection, FAB).
      if (zoomTierRef.current !== nextTier) {
        zoomTierRef.current = nextTier;
        setZoomTier(nextTier);
      }
      if (currentFocused && region.latitudeDelta < REGION_FOCUS_INITIAL_DELTA) {
        setHasRegionZoomStarted(true);
      }

      if (isMapAnimatingRef.current) {
        return;
      }

      // Release post-focus guard once interaction has settled on non-world zoom.
      // Without this, zooming back out can keep region scope latched.
      if (suppressWorldResetRef.current && nextTier !== "world") {
        suppressWorldResetRef.current = false;
      }

      if (nextTier === "world") {
        clearPendingRegionSwitch();
        if (!suppressWorldResetRef.current) {
          clearExplicitRegionLock();
          resetGlobalPulse();
          clearCountrySelection();
          setHasRegionZoomStarted(false);
        }
        return;
      }

      suppressWorldResetRef.current = false;
      setDisplayMode("explore");

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
      clearCountrySelection,
      clearExplicitRegionLock,
      clearPendingRegionSwitch,
      computeZoomTier,
      is3d,
      resetGlobalPulse,
      resolveNearestRegionByCenter,
      setDisplayMode,
      setFocusedRegion,
      setHasRegionZoomStarted,
    ],
  );

  const focusCountryOnFlatMap = useCallback(
    (
      pick: MapCountry,
      duration = 650,
      framing: "continent" | "country" = "country",
    ) => {
      setDisplayMode("explore");
      suppressWorldResetRef.current = true;
      setFocusedRegion(pick.region);
      lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));

      if (framing === "continent") {
        setHasRegionZoomStarted(false);
        zoomTierRef.current = "region";
        setZoomTier("region");
        animateMapToRegion(
          regionForMapCountry(pick, REGION_FOCUS_INITIAL_DELTA),
          duration,
        );
        return;
      }

      enterCountryDetailMode();
      animateMapToRegion(regionForMapCountry(pick), duration);
    },
    [
      animateMapToRegion,
      enterCountryDetailMode,
      lockExplicitRegion,
      setDisplayMode,
      setFocusedRegion,
      setHasRegionZoomStarted,
    ],
  );

  const flyMapToCountry = useCallback(
    (
      pick: MapCountry,
      duration = 650,
      framing: "continent" | "country" = "country",
    ) => {
      if (is3d) {
        // Slower globe pan for spotlight/random — avoids abrupt jumps.
        const globeDuration = Math.max(duration, 1100);
        if (framing === "country") {
          setHasRegionZoomStarted(true);
        }
        focusCountryOnGlobe(pick.name, globeDuration);
        return;
      }

      focusCountryOnFlatMap(pick, duration, framing);
    },
    [focusCountryOnFlatMap, focusCountryOnGlobe, is3d, setHasRegionZoomStarted],
  );

  const handleFlatTransitionComplete = useCallback(() => {
    const focusName = pendingFlatFocusNameRef.current;
    pendingFlatFocusNameRef.current = null;

    setMapMode("2d");
    setMapViewTransition("idle");

    if (!focusName || countries.length === 0) {
      return;
    }

    const pick = countries.find((c) => c.name === focusName) ?? null;
    if (!pick) {
      return;
    }

    const wasActive =
      useIdentityStore.getState().activeCountry?.name === focusName;
    const hadPreview = previewCountryName === focusName;

    if (hadPreview) {
      setPreviewCountryName(focusName);
    }

    focusCountryOnFlatMap(
      pick,
      650,
      wasActive || hadPreview ? "country" : "continent",
    );
  }, [countries, focusCountryOnFlatMap, previewCountryName, setMapMode]);

  const applyPendingExternalMapFocus = useCallback(() => {
    const pendingName = useMapStore.getState().pendingExternalFocusName;
    if (!pendingName || countries.length === 0) return;

    const pick =
      countries.find((c) => c.name === pendingName) ??
      useIdentityStore.getState().activeCountry;
    if (!pick) return;

    setActiveChip("all");
    setFeaturedShortcut(null);

    const duration = is3d ? 1100 : 650;
    setPreviewDismissToContinent(!!useMapUiStore.getState().focusedRegion);
    syncRegionFocusForCountry(pick);
    selectCountryOnMap(pick, "search");

    if (is3d) {
      startCountryFocusTransition(pick.name, duration);
    } else {
      pendingActiveCountryRef.current = pick.name;
      setFocusTransitionCountryName(pick.name);
    }
    flyMapToCountry(pick, duration, "country");

    if (!is3d || useMapStore.getState().globeCamera) {
      clearPendingExternalFocus();
    }
  }, [
    clearPendingExternalFocus,
    countries,
    flyMapToCountry,
    is3d,
    setActiveChip,
    setFeaturedShortcut,
    startCountryFocusTransition,
    syncRegionFocusForCountry,
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

  const handleCountryPress = useCallback(
    (country: MapCountry) => {
      if (activeCountry?.name === country.name && isPreviewOpen) {
        return;
      }
      if (activeCountry?.name === country.name) {
        openCountryPreview(country);
        return;
      }
      focusCountryOnMap(country, "mapTap");
    },
    [
      activeCountry?.name,
      focusCountryOnMap,
      isPreviewOpen,
      openCountryPreview,
    ],
  );

  const handleForYouPress = useCallback(async () => {
    if (countries.length === 0) return;
    if (randomPickBusyRef.current || isMapAnimatingRef.current) return;

    randomPickBusyRef.current = true;
    try {
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

      setActiveChip("all");
      setFeaturedShortcut("forYou");
      focusCountryOnMap(pick, "shuffle");
    } finally {
      randomPickBusyRef.current = false;
    }
  }, [countries, focusCountryOnMap, setActiveChip, setFeaturedShortcut]);

  const handleNewActivityPress = useCallback(async () => {
    if (countries.length === 0) return;
    if (randomPickBusyRef.current || isMapAnimatingRef.current) return;

    randomPickBusyRef.current = true;
    try {
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
      focusCountryOnMap(pick, "shuffle");
    } finally {
      randomPickBusyRef.current = false;
    }
  }, [countries, focusCountryOnMap, setActiveChip, setFeaturedShortcut]);

  const handleRandomCountry = useCallback(async () => {
    if (countries.length === 0) return;
    // Ignore taps while a previous pick is resolving or its camera flight is
    // still in progress — overlapping animateToRegion calls crash iOS maps.
    if (randomPickBusyRef.current || isMapAnimatingRef.current) return;

    randomPickBusyRef.current = true;
    try {
      const pool = await buildMapRandomPool({
        countries,
        activeChip,
        featuredShortcut,
        focusedRegion,
        useWorldPool: is3d || zoomTierRef.current === "world",
      });
      const pick = pickRandomMapCountry(pool);
      if (!pick) return;

      const showHint = !hasSeenRandomCountryHint;
      focusCountryOnMap(pick, "fab");
      if (showHint) {
        setRandomCountryHint(pick);
        dismissRandomCountryHint();
      }
    } finally {
      randomPickBusyRef.current = false;
    }
  }, [
    activeChip,
    countries,
    dismissRandomCountryHint,
    featuredShortcut,
    focusCountryOnMap,
    focusedRegion,
    hasSeenRandomCountryHint,
    is3d,
  ]);

  const handleNextCountry = useCallback(async () => {
    if (!activeCountry || countries.length === 0 || isNextCountryLoading) {
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
      const pick = pickRandomMapCountry(pool, activeCountry.name);
      if (!pick) return;

      advanceToCountryPreview(pick);
    } finally {
      setIsNextCountryLoading(false);
    }
  }, [
    activeChip,
    activeCountry,
    advanceToCountryPreview,
    countries,
    featuredShortcut,
    focusedRegion,
    is3d,
    isNextCountryLoading,
  ]);

  const handleReset = useCallback(() => {
    cancelIntent();
    suppressWorldResetRef.current = false;
    clearExplicitRegionLock();
    mapRef.current?.resetWorldView();
    resetGlobalPulse();
    setZoomTier("world");
    zoomTierRef.current = "world";
    clearCountrySelection();
    setHasRegionZoomStarted(false);
    setActiveChip("all");
  }, [
    cancelIntent,
    clearCountrySelection,
    clearExplicitRegionLock,
    resetGlobalPulse,
    setActiveChip,
    setHasRegionZoomStarted,
  ]);

  const handleBackToWorld = useCallback(() => {
    cancelIntent();
    suppressWorldResetRef.current = false;
    clearExplicitRegionLock();
    mapRef.current?.resetWorldView();
    resetGlobalPulse();
    setZoomTier("world");
    zoomTierRef.current = "world";
    clearCountrySelection();
    setHasRegionZoomStarted(false);
  }, [
    cancelIntent,
    clearCountrySelection,
    clearExplicitRegionLock,
    resetGlobalPulse,
    setHasRegionZoomStarted,
  ]);

  const recenterOnFocusedContinent = useCallback(
    (cluster: MapCluster) => {
      const flightDuration = 650;

      if (isMapAnimatingRef.current) return;
      beginProgrammaticMapFlight(flightDuration);
      suppressWorldResetRef.current = true;
      clearPendingRegionSwitch();
      lockExplicitRegion(cluster.region, cluster.center);

      const focusRegion = regionForClusterFocus(cluster);
      setLastMapRegion(focusRegion);

      if (is3d) {
        const [lat, lng] = cluster.center;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          focusLatLngOnGlobe(lat, lng, flightDuration);
        }
        return;
      }

      mapRef.current?.animateToRegion(focusRegion, flightDuration);
    },
    [
      beginProgrammaticMapFlight,
      clearPendingRegionSwitch,
      focusLatLngOnGlobe,
      is3d,
      lockExplicitRegion,
    ],
  );

  const handleBackToContinent = useCallback(() => {
    if (!focusedRegion) return;

    const cluster = clusters.find((c) => c.region === focusedRegion);
    if (!cluster) return;

    recenterOnFocusedContinent(cluster);
  }, [clusters, focusedRegion, recenterOnFocusedContinent]);

  const zoomOutToContinentView = useCallback(
    (region: string, duration = 650) => {
      if (isMapAnimatingRef.current) return;

      const cluster = clusters.find((c) => c.region === region);
      if (!cluster) return;

      cancelIntent();
      setFocusedRegion(region);
      suppressWorldResetRef.current = true;
      clearPendingRegionSwitch();
      setHasRegionZoomStarted(false);
      zoomTierRef.current = "region";
      setZoomTier("region");
      lockExplicitRegion(cluster.region, cluster.center);

      beginProgrammaticMapFlight(duration);

      const focusRegion = regionForClusterFocus(cluster);
      setLastMapRegion(focusRegion);

      if (is3d) {
        const [lat, lng] = cluster.center;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          focusLatLngOnGlobe(lat, lng, duration, GLOBE_REGION_CAMERA_DISTANCE);
        }
        return;
      }

      mapRef.current?.animateToRegion(focusRegion, duration);
    },
    [
      beginProgrammaticMapFlight,
      cancelIntent,
      clearPendingRegionSwitch,
      clusters,
      focusLatLngOnGlobe,
      is3d,
      lockExplicitRegion,
      setFocusedRegion,
      setHasRegionZoomStarted,
    ],
  );

  const dismissCountryPreview = useCallback(() => {
    cancelIntent();
    const dismissToContinent =
      previewDismissToContinent &&
      !!useMapUiStore.getState().focusedRegion;

    setPreviewCountryName(null);
    setPreviewDismissToContinent(false);
    clearFocusTransition();
    clearActiveCountry();
    resetExperience();

    const region = useMapUiStore.getState().focusedRegion;

    if (dismissToContinent && region) {
      zoomOutToContinentView(region, 650);
      return;
    }

    clearExplicitRegionLock();
    suppressWorldResetRef.current = false;
    setFocusedRegion(null);
    setHasRegionZoomStarted(false);
    zoomTierRef.current = "world";
    setZoomTier("world");
    resetGlobalPulse();
    mapRef.current?.resetWorldView();
  }, [
    cancelIntent,
    clearActiveCountry,
    clearExplicitRegionLock,
    clearFocusTransition,
    previewDismissToContinent,
    resetExperience,
    resetGlobalPulse,
    setFocusedRegion,
    setHasRegionZoomStarted,
    zoomOutToContinentView,
  ]);

  const handleMapPress = useCallback(
    (coordinate?: MapPressCoordinate) => {
      if (previewCountryName) {
        dismissCountryPreview();
        return;
      }

      if (activeCountry) {
        if (coordinate) {
          showTapRipple(coordinate);
        }
        clearCountryFocus();
        return;
      }

      if (coordinate) {
        const cluster = findClusterAtWorldCoordinate(
          allBoundaryPolygons,
          countries,
          clusters,
          coordinate,
        );

        if (focusedRegion) {
          if (cluster?.region === focusedRegion) {
            showTapRipple(coordinate);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            recenterOnFocusedContinent(cluster);
          } else if (cluster) {
            requestContinentFocus(cluster);
          } else {
            showTapRipple(coordinate);
          }
          return;
        }

        if (is3d || zoomTierRef.current === "world") {
          if (cluster) {
            requestContinentFocus(cluster);
            return;
          }
          showTapRipple(coordinate);
          return;
        }
      }
    },
    [
      activeCountry,
      allBoundaryPolygons,
      clearCountryFocus,
      clusters,
      countries,
      dismissCountryPreview,
      focusedRegion,
      is3d,
      previewCountryName,
      recenterOnFocusedContinent,
      requestContinentFocus,
      showTapRipple,
    ],
  );

  const showRegionChrome =
    !!focusedRegion && !activeCountry && !isPreviewOpen;
  const showCountryFocusPill = !!activeCountry && !isPreviewOpen;
  const showFlagToggle = mapMarkerCountries.length > 0;

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const mapChromeClearance = showRegionChrome ? 100 : 88;
  const mapOverlayBottom = regionChromeBottom + mapChromeClearance;
  const countryFocusPillBottom = mapOverlayBottom;
  const randomHintBottom = mapOverlayBottom + 64;
  const previewBottomOffset = 0;
  const previewSheetBottomInset = Math.max(insets.bottom, 16);
  const onboardingBottom = Math.max(insets.bottom, 16) + 88;
  const showOnboarding =
    !hasSeenMapOnboarding &&
    (is3d || zoomTier === "world") &&
    status !== "loading" &&
    countries.length > 0 &&
    activeCountry === null &&
    focusTransitionCountryName === null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <MapCanvas
        ref={mapRef}
        countries={mapMarkersForCanvas}
        boundaryCountries={countries}
        clusters={clusters}
        selectedName={selectedMapName}
        focusTransitionName={focusTransitionCountryName}
        focusedRegion={focusedRegion}
        previewRegion={previewRegion}
        tapRippleAt={tapRippleAt}
        tapRippleToken={tapRippleToken}
        zoomTier={
          is3d ? "region" : activeCountry ? "country" : zoomTier
        }
        countryMarkerMode={countryMarkerMode}
        markerPresentation={markerReveal.presentation}
        markerRevealGeneration={markerReveal.revealGeneration}
        mapViewTransition={mapViewTransition}
        onGlobeTransitionComplete={handleGlobeTransitionComplete}
        onFlatTransitionComplete={handleFlatTransitionComplete}
        onGlobeCameraViewChange={handleGlobeCameraViewChange}
        lockUserGestures={isPreviewOpen}
        suspendMarkerSnapshot={isMapAnimating}
        markerRefreshToken={markerRefreshToken}
        onCountryPress={handleCountryPress}
        onClusterPress={requestContinentFocus}
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

        {isPreviewOpen && activeCountry ? (
          <View
            style={[styles.previewWrap, { bottom: previewBottomOffset }]}
            pointerEvents="box-none"
          >
            <MapCountryPreviewCard
              country={activeCountry}
              bottomInset={previewSheetBottomInset}
              onDismiss={dismissCountryPreview}
              onBackToContinent={
                previewDismissToContinent && focusedRegion
                  ? dismissCountryPreview
                  : undefined
              }
              backToRegionLabel={
                focusedRegion
                  ? continentDisplayLabel(focusedRegion)
                  : undefined
              }
              onNextCountry={() => void handleNextCountry()}
              isNextCountryLoading={isNextCountryLoading}
            />
          </View>
        ) : showOnboarding ? (
          <View style={[styles.previewWrap, { bottom: onboardingBottom }]}>
            <MapOnboardingSheet onDismiss={() => dismissMapOnboarding()} />
          </View>
        ) : null}

        {showRegionChrome && focusedRegion ? (
          <MapRegionChrome
            focusedRegion={focusedRegion}
            bottom={regionChromeBottom}
            onContinentPress={handleBackToContinent}
            onWorldPress={handleBackToWorld}
          />
        ) : null}

        {showCountryFocusPill && activeCountry ? (
          <MapCountryFocusPill
            country={activeCountry}
            bottom={countryFocusPillBottom}
            onOpenDetails={() => openCountryPreview(activeCountry)}
            onDismiss={clearCountryFocus}
          />
        ) : null}

        {randomCountryHint ? (
          <MapRandomCountryHint
            country={randomCountryHint}
            bottom={randomHintBottom}
            onDismiss={() => setRandomCountryHint(null)}
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
              bottom={mapOverlayBottom}
            />

            <RandomCountryFab
              bottom={mapOverlayBottom}
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
