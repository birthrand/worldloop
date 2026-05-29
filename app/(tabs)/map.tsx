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
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

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
import { MapTopChromeScrim } from "@/components/map/map-top-chrome-scrim";
import {
  regionForClusterFocus,
  regionForMapCountry,
  WORLD_INITIAL_REGION,
} from "@/constants/map-regions";
import { continentDisplayLabel } from "@/constants/regions";
import { useContinentIntent } from "@/hooks/use-continent-intent";
import { useMapFlight } from "@/hooks/use-map-flight";
import { useMapMarkerReveal } from "@/hooks/use-map-marker-reveal";
import {
  deriveCameraZoomState,
  resolveFlatZoomTier,
} from "@/lib/map-camera-zoom";
import { buildMapClusters, type MapCluster } from "@/lib/map-clusters";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import { parseCountryBoundaryPolygons } from "@/lib/map-country-boundaries";
import {
  installMapDebugErrorHandler,
  logMapDebug,
  summarizeCountry,
  summarizeRegion,
} from "@/lib/map-debug";
import { buildDiscoveryPhases } from "@/lib/map-discovery-flight";
import {
  findClusterAtWorldCoordinate,
  type MapPressCoordinate,
} from "@/lib/map-map-tap-hit";
import { isCountryPreviewOpen } from "@/lib/map-presentation";
import {
  commitMapPresentation,
  dismissMapPreview,
  resetMapPresentation,
} from "@/lib/map-presentation-transition";
import {
  buildMapRandomPool,
  pickBiasedRandomMapCountry,
  pickRandomMapCountry,
  resolveMapRandomUseWorldPool,
} from "@/lib/map-random-pick";
import { syncMapRegionFocusForCountry } from "@/lib/map-region-focus";
import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
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
import { useMapPresentationStore } from "@/store/use-map-presentation-store";
import { filterMapCountriesByChip, useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

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

/**
 * Minimum gap between accepted random-FAB taps. Absorbs the brief async window
 * (pool resolution) before `isMapAnimating` flips true, so a double-tap can't
 * launch two flights whose animateToRegion calls overlap (iOS maps crash).
 */
const RANDOM_FAB_TAP_COOLDOWN_MS = 650;

/** Preview card "back to continent" action — off until UX is finalized. */
const PREVIEW_CONTINENT_BACK_ENABLED = false;

/** Selected country must stay in the marker list (Explore → Map can freeze before region sync). */
function withRequiredMapMarker(
  markers: MapCountry[],
  countryName: string | null,
  pool: MapCountry[],
): MapCountry[] {
  if (!countryName) return markers;
  if (markers.some((c) => c.name === countryName)) return markers;

  const extra =
    pool.find((c) => c.name === countryName) ??
    useIdentityStore.getState().activeCountry;
  if (!extra || extra.name !== countryName) return markers;

  return [...markers, extra];
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const mapRef = useRef<MapCanvasHandle>(null);
  /** True while a programmatic camera flight is sequencing (controller-driven). */
  const isMapAnimatingRef = useRef(false);
  const [isMapAnimating, setIsMapAnimating] = useState(false);
  /** Supersedes stale async random/shuffle pool resolutions when taps overlap. */
  const randomPickGenerationRef = useRef(0);
  /** Timestamp of the last accepted random-FAB tap — throttles rapid taps. */
  const lastRandomFabTapAtRef = useRef(0);
  const shufflePickGenerationRef = useRef(0);
  /** Monotonic id — only the latest navigation intent may drive the camera. */
  const navigationIntentIdRef = useRef(0);
  const pendingExploreRegionSyncRef = useRef<MapCountry | null>(null);
  const exploreHandoffSuppressMarkersRef = useRef(false);
  const [exploreHandoffSuppressMarkers, setExploreHandoffSuppressMarkers] =
    useState(false);
  const [markerRefreshToken, setMarkerRefreshToken] = useState(0);
  /** Blocks world-zoom reset while animating into a continent/country focus. */
  const suppressWorldResetRef = useRef(false);
  const pendingRegionSwitchTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingRegionCandidateRef = useRef<string | null>(null);
  const explicitRegionLockRef = useRef<{
    region: string;
    anchor: [number, number];
  } | null>(null);
  const pendingGlobeFocusNameRef = useRef<string | null>(null);
  /** Continent to center on the globe after 2D → 3D when no country is selected. */
  const pendingGlobeRegionFocusRef = useRef<string | null>(null);
  /** Country to focus on the 2D map after 3D → 2D crossfade completes. */
  const pendingFlatFocusNameRef = useRef<string | null>(null);
  /** Presentation mode to restore after 3D → 2D crossfade completes. */
  const pendingFlatPresentationModeRef = useRef<MapPresentationMode | null>(
    null,
  );
  /** Prevents duplicate external-focus camera flights from focus + effect racing. */
  const externalFocusAppliedRef = useRef<string | null>(null);
  /** 2D MapView is interactive — external flights must wait or they no-op silently. */
  const flatMapReadyRef = useRef(false);
  const [flatMapReadyToken, setFlatMapReadyToken] = useState(0);
  /** Live flat-map zoom (latitudeDelta) — synchronous reads for callbacks. */
  const flatLatitudeDeltaRef = useRef(WORLD_INITIAL_REGION.latitudeDelta);
  /** Settles globe focuses (3D camera move isn't tracked by the flat controller). */
  const globeSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
  const [randomCountryHint, setRandomCountryHint] = useState<MapCountry | null>(
    null,
  );
  /**
   * Country just deselected (X / map tap) while staying in continent mode. The
   * focal pin isn't always part of the region's marker subset, so we keep it
   * pinned as a normal flag until we leave its region — otherwise it vanishes.
   */
  const [lingeringDeselectedName, setLingeringDeselectedName] = useState<
    string | null
  >(null);

  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const activeCountry = useIdentityStore((s) => s.activeCountry);
  const clearActiveCountry = useIdentityStore((s) => s.clearActiveCountry);
  const activeChip = useMapStore((s) => s.activeChip);
  const countries = useMapStore((s) => s.countries);
  const mapMode = useMapStore((s) => s.mapMode);
  const loadMapCountries = useMapStore((s) => s.loadMapCountries);
  const mapCountriesFullyLoaded = useMapStore((s) => s.mapCountriesFullyLoaded);
  const setActiveChip = useMapStore((s) => s.setActiveChip);
  const setMapMode = useMapStore((s) => s.setMapMode);
  const focusCountryOnGlobe = useMapStore((s) => s.focusCountryOnGlobe);
  const focusLatLngOnGlobe = useMapStore((s) => s.focusLatLngOnGlobe);
  const clearPendingMapIntent = useMapStore((s) => s.clearPendingMapIntent);
  const pendingMapIntent = useMapStore((s) => s.pendingMapIntent);
  const globeCamera = useMapStore((s) => s.globeCamera);

  const presentationMode = useMapPresentationStore((s) => s.mode);
  const setPresentationMode = useMapPresentationStore((s) => s.setMode);

  const pulsing = useExperienceStore((s) => s.pulsing);
  const endExperienceTransition = useExperienceStore((s) => s.endTransition);
  const resetExperience = useExperienceStore((s) => s.resetExperience);

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

  const [mapViewTransition, setMapViewTransition] =
    useState<MapViewTransition>("idle");
  const [isPreviewShufflePending, setIsPreviewShufflePending] = useState(false);
  const [flatLatitudeDelta, setFlatLatitudeDelta] = useState(
    WORLD_INITIAL_REGION.latitudeDelta,
  );
  const [globeCameraDistance, setGlobeCameraDistance] = useState(
    GLOBE_DETAIL_CAMERA_DISTANCE + 2,
  );
  const [globeViewCenter, setGlobeViewCenter] = useState({
    latitude: 0,
    longitude: -30,
  });
  const [lastMapRegion, setLastMapRegion] = useState(WORLD_INITIAL_REGION);
  const is3d = isGlobeMapUi(mapMode, mapViewTransition);

  /** Single source of truth for zoom-driven UI + marker density (live camera). */
  const cameraZoomState = useMemo(
    () =>
      deriveCameraZoomState({
        is3d,
        latitudeDelta: flatLatitudeDelta,
        globeDistance: globeCameraDistance,
      }),
    [is3d, flatLatitudeDelta, globeCameraDistance],
  );
  const cameraTier = cameraZoomState.tier;
  const isDetailZoom = cameraZoomState.isDetailZoom;

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
  const focalMarkerName =
    activeCountryName ?? focusTransitionCountryName ?? null;

  const pinCountries = useMemo(() => {
    if (exploreHandoffSuppressMarkers) {
      if (!activeCountryName) return [];
      const pin = countries.find((c) => c.name === activeCountryName) ?? null;
      return pin ? [pin] : [];
    }

    if (!focusedRegion) {
      if (is3d) {
        if (!activeCountryName) return [];
        const pin = countries.find((c) => c.name === activeCountryName) ?? null;
        return pin ? [pin] : [];
      }
      return [];
    }

    const base = countries.filter((c) => c.region === focusedRegion);
    const visible = filterMapCountriesByChip(base, activeChip);

    // Density follows the live camera zoom, not the selection or flight phase.
    const showAllRegionMarkers =
      isDetailZoom || (pulsing && !!activeCountryName);

    return showAllRegionMarkers
      ? visible
      : resolveRegionMarkerCountries(visible, false, focalMarkerName);
  }, [
    activeChip,
    activeCountryName,
    countries,
    exploreHandoffSuppressMarkers,
    focalMarkerName,
    focusedRegion,
    is3d,
    isDetailZoom,
    pulsing,
  ]);

  const markerViewportCenter = useMemo(() => {
    if (focalMarkerName && !isDetailZoom) {
      const focal =
        countries.find((c) => c.name === focalMarkerName) ?? null;
      if (focal) {
        const [lat, lng] = getMapDisplayLatLng(focal);
        if (isValidLatLng([lat, lng])) {
          return { latitude: lat, longitude: lng };
        }
      }
    }

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
    countries,
    focalMarkerName,
    focusedRegion,
    globeCameraDistance,
    globeViewCenter,
    is3d,
    isDetailZoom,
    lastMapRegion.latitude,
    lastMapRegion.longitude,
  ]);

  const markerReveal = useMapMarkerReveal({
    candidateCountries: pinCountries,
    viewportCenter: markerViewportCenter,
    focusedRegion,
    focalCountryName: focalMarkerName,
    isDetailZoom,
    enabled: !!focusedRegion,
    // Freeze marker mounts during flat flights — marker churn overlapping
    // animateToRegion crashes react-native-maps on iOS.
    paused: isMapAnimating && !is3d,
  });

  const mapMarkerCountries = useMemo(() => {
    const withSelected = withRequiredMapMarker(
      markerReveal.countriesToRender,
      activeCountryName ?? focusTransitionCountryName,
      countries,
    );
    // Keep the just-deselected country visible (as a plain flag) until we leave
    // its region, so pressing X doesn't make the focal pin disappear.
    return withRequiredMapMarker(
      withSelected,
      lingeringDeselectedName,
      countries,
    );
  }, [
    activeCountryName,
    countries,
    focusTransitionCountryName,
    lingeringDeselectedName,
    markerReveal.countriesToRender,
  ]);

  // Density adapts live during flights — no frozen snapshot.
  const mapMarkersForCanvas = mapMarkerCountries;

  // Drop the lingering deselected pin once the camera leaves its region
  // (world reset or a different continent), so it doesn't stick around.
  useEffect(() => {
    if (!lingeringDeselectedName) return;
    const country =
      countries.find((c) => c.name === lingeringDeselectedName) ?? null;
    if (!focusedRegion || (country && country.region !== focusedRegion)) {
      setLingeringDeselectedName(null);
    }
  }, [countries, focusedRegion, lingeringDeselectedName]);

  useEffect(() => {
    logMapDebug("marker", "canvas marker set", {
      count: mapMarkersForCanvas.length,
      selected: activeCountryName ?? focusTransitionCountryName,
      focusedRegion,
      isMapAnimating,
      paused: isMapAnimating && !is3d,
      revealGeneration: markerReveal.revealGeneration,
    });
  }, [
    activeCountryName,
    focusTransitionCountryName,
    focusedRegion,
    is3d,
    isMapAnimating,
    mapMarkersForCanvas.length,
    markerReveal.revealGeneration,
  ]);

  const selectedMapName = activeCountryName ?? focusTransitionCountryName;

  const isPreviewOpen = isCountryPreviewOpen(presentationMode, activeCountry);

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
    installMapDebugErrorHandler();
  }, []);

  useEffect(() => {
    if (mapCountriesFullyLoaded || status === "loading") return;
    void loadMapCountries();
  }, [mapCountriesFullyLoaded, status, loadMapCountries]);

  /** Navigate-first external entry: always fetch the full map list even if one country was injected. */
  useEffect(() => {
    if (!pendingMapIntent || mapCountriesFullyLoaded || status === "loading") {
      return;
    }
    void loadMapCountries();
  }, [pendingMapIntent, mapCountriesFullyLoaded, status, loadMapCountries]);

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

  /** Camera flight active-state — drives pulse end + per-marker snapshot smoothing. */
  const handleFlightActiveChange = useCallback(
    (active: boolean) => {
      logMapDebug("camera", "flight active change", {
        active,
        focusTransition: focusTransitionCountryName,
        activeCountry: activeCountry?.name ?? null,
      });
      isMapAnimatingRef.current = active;
      setIsMapAnimating(active);
      if (!active) {
        setFocusTransitionCountryName(null);
        endExperienceTransition();
        setMarkerRefreshToken((token) => token + 1);

        if (exploreHandoffSuppressMarkersRef.current) {
          exploreHandoffSuppressMarkersRef.current = false;
          setExploreHandoffSuppressMarkers(false);
          const pending = pendingExploreRegionSyncRef.current;
          pendingExploreRegionSyncRef.current = null;
          if (pending) {
            syncMapRegionFocusForCountry(pending);
            logMapDebug("intent", "explore region sync after flight", {
              region: pending.region,
              country: pending.name,
            });
          }
        }
      }
    },
    [activeCountry?.name, endExperienceTransition, focusTransitionCountryName],
  );

  const flatAnimator = useCallback((region: Region, duration: number) => {
    const summary = summarizeRegion(region);
    logMapDebug("camera", "flat animateToRegion", {
      duration,
      region: summary,
      hasMapRef: !!mapRef.current,
    });
    if (!summary.finite) {
      logMapDebug("camera", "WARN non-finite region — may crash MapView", {
        region: summary,
      });
    }
    try {
      mapRef.current?.animateToRegion(region, duration);
    } catch (err) {
      logMapDebug("camera", "ERROR flat animateToRegion threw", {
        error: err instanceof Error ? err.message : String(err),
        region: summary,
      });
      throw err;
    }
  }, []);

  const flight = useMapFlight({
    animateToRegion: flatAnimator,
    onActiveChange: handleFlightActiveChange,
  });

  /** Stops any active flight (flat phases or globe settle) and clears the busy flag. */
  const cancelCameraFlight = useCallback(() => {
    logMapDebug("camera", "cancelCameraFlight", {
      hadGlobeSettleTimer: !!globeSettleTimerRef.current,
      flightWasActive: flight.isActive(),
    });
    flight.cancel();
    if (globeSettleTimerRef.current) {
      clearTimeout(globeSettleTimerRef.current);
      globeSettleTimerRef.current = null;
    }
    isMapAnimatingRef.current = false;
    setIsMapAnimating(false);
  }, [flight]);

  const animateMapToRegion = useCallback(
    (region: Region, duration = 500) => {
      flight.flyTo([{ region, duration }]);
    },
    [flight],
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
    setFocusTransitionCountryName(null);
  }, []);

  const clearCountrySelection = useCallback(() => {
    resetMapPresentation();
    clearFocusTransition();
    clearActiveCountry();
    resetExperience();
    setLingeringDeselectedName(null);
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

  const flightCancelRef = useRef(flight.cancel);
  flightCancelRef.current = flight.cancel;

  /** Unmount cleanup only — do not depend on `flight` identity (it changes each render). */
  useEffect(() => {
    return () => {
      clearPendingRegionSwitch();
      flightCancelRef.current();
      if (globeSettleTimerRef.current) {
        clearTimeout(globeSettleTimerRef.current);
        globeSettleTimerRef.current = null;
      }
      isMapAnimatingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional unmount-only cleanup
  }, []);

  const commitClusterFocus = useCallback(
    (cluster: MapCluster) => {
      clearPendingRegionSwitch();
      clearCountrySelection();
      setFeaturedShortcut(null);
      setDisplayMode("explore");
      suppressWorldResetRef.current = true;
      setFocusedRegion(cluster.region);
      lockExplicitRegion(cluster.region, cluster.center);

      const focusRegion = regionForClusterFocus(cluster);
      setLastMapRegion(focusRegion);

      if (is3d) {
        const [lat, lng] = cluster.center;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          useMapStore.getState().focusLatLngOnGlobe(lat, lng, 650);
        }
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
      lockExplicitRegion,
    ],
  );

  const { previewRegion, requestContinentFocus, cancelIntent } =
    useContinentIntent({
      onCommit: commitClusterFocus,
      focusedRegion,
    });

  const resolveCountryFlightDuration = useCallback(
    (source: Exclude<SelectionSource, null>, useGlobeCamera: boolean) => {
      if (source === "explore") {
        return useGlobeCamera ? 1400 : 900;
      }
      const baseDuration =
        source === "mapTap" ? (useGlobeCamera ? 450 : 500) : 650;
      return useGlobeCamera ? Math.max(baseDuration, 1100) : baseDuration;
    },
    [],
  );

  const handleFlatMapReady = useCallback(() => {
    if (flatMapReadyRef.current) return;
    flatMapReadyRef.current = true;
    logMapDebug("camera", "flat map ready");
    setFlatMapReadyToken((token) => token + 1);
  }, []);

  /** Single-flight 2D move to a country/continent frame (used post 3D→2D restore). */
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

      const region =
        framing === "continent"
          ? regionForMapCountry(pick, REGION_FOCUS_INITIAL_DELTA)
          : regionForMapCountry(pick);
      flight.flyTo([{ region, duration }]);
    },
    [flight, lockExplicitRegion, setDisplayMode, setFocusedRegion],
  );

  /**
   * Commits selection + presentation immediately (never waits on the camera),
   * then runs the structural three-phase flight. Interruptible/retargetable:
   * a new intent supersedes any in-flight sequence.
   */
  const applyCountryIntent = useCallback(
    (
      pick: MapCountry,
      mode: "focus" | "preview",
      source: Exclude<SelectionSource, null>,
    ) => {
      navigationIntentIdRef.current += 1;
      const intentId = navigationIntentIdRef.current;
      logMapDebug("intent", "applyCountryIntent start", {
        intentId,
        source,
        mode,
        country: summarizeCountry(pick),
        mapMode,
        mapViewTransition,
        presentationMode,
        previousCountry: summarizeCountry(activeCountry),
      });
      cancelIntent();
      cancelCameraFlight();
      // A fresh focus supersedes any lingering deselected pin.
      setLingeringDeselectedName(null);
      // "Back to continent" is offered only when we were already exploring a region.
      setPreviewDismissToContinent(!!useMapUiStore.getState().focusedRegion);
      setDisplayMode("explore");

      // Intent commits synchronously — focus pill / preview update right away.
      commitMapPresentation({ country: pick, mode, source });
      setFocusTransitionCountryName(pick.name);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const useGlobeCamera =
        mapMode === "3d" && mapViewTransition !== "enteringFlat";
      const deferExploreRegionMarkers = source === "explore" && !useGlobeCamera;

      if (deferExploreRegionMarkers) {
        exploreHandoffSuppressMarkersRef.current = true;
        setExploreHandoffSuppressMarkers(true);
        pendingExploreRegionSyncRef.current = pick;
        suppressWorldResetRef.current = true;
        lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));
        logMapDebug("intent", "explore handoff — deferring region markers", {
          intentId,
          region: pick.region,
        });
      } else {
        syncRegionFocusForCountry(pick);
      }

      if (useGlobeCamera) {
        const globeDuration = resolveCountryFlightDuration(source, true);
        logMapDebug("intent", "globe camera path", {
          intentId,
          source,
          globeDuration,
          mapViewTransition,
          hasGlobeCamera: !!useMapStore.getState().globeCamera,
        });
        // The flat flight controller doesn't drive the globe — track the
        // settle window manually so pulse/transition end like a flat flight.
        flight.cancel();
        isMapAnimatingRef.current = true;
        setIsMapAnimating(true);
        if (globeSettleTimerRef.current) {
          clearTimeout(globeSettleTimerRef.current);
        }
        globeSettleTimerRef.current = setTimeout(() => {
          globeSettleTimerRef.current = null;
          handleFlightActiveChange(false);
        }, globeDuration + 300);

        if (
          mapViewTransition !== "ready" ||
          !useMapStore.getState().globeCamera
        ) {
          pendingGlobeFocusNameRef.current = pick.name;
          logMapDebug("intent", "globe focus deferred", {
            intentId,
            pendingName: pick.name,
            mapViewTransition,
          });
          return;
        }
        if (source === "fab") {
          const [lat, lng] = getMapDisplayLatLng(pick);
          logMapDebug("camera", "focusContinentOnGlobe (fab)", {
            intentId,
            name: pick.name,
            duration: globeDuration,
          });
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            focusLatLngOnGlobe(
              lat,
              lng,
              globeDuration,
              GLOBE_REGION_CAMERA_DISTANCE,
            );
          }
        } else {
          logMapDebug("camera", "focusCountryOnGlobe", {
            intentId,
            name: pick.name,
            duration: globeDuration,
          });
          focusCountryOnGlobe(pick.name, globeDuration);
        }
        return;
      }

      const cluster = clusters.find((c) => c.region === pick.region) ?? null;
      const phases = buildDiscoveryPhases({
        pick,
        cluster,
        source,
        includeWorld: source === "search",
      });
      logMapDebug("intent", "flat flight path", {
        intentId,
        source,
        phaseCount: phases.length,
        clusterRegion: cluster?.region ?? null,
        deferExploreRegionMarkers,
      });

      // Mark animating NOW (synchronously) so the marker reveal pauses on the
      // very next render — before the deferred camera move runs. Otherwise the
      // region's batched pin reveal keeps mounting and collides with
      // animateToRegion, crashing react-native-maps on iOS.
      isMapAnimatingRef.current = true;
      setIsMapAnimating(true);

      // Defer the camera move until React has committed this intent's marker
      // changes (paused reveal + new selection). Starting animateToRegion in the
      // same frame as a marker mount crashes iOS maps.
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          if (navigationIntentIdRef.current !== intentId) {
            logMapDebug("intent", "deferred flight skipped (superseded)", {
              intentId,
              currentIntentId: navigationIntentIdRef.current,
            });
            return;
          }
          flight.flyTo(phases);
        });
      });
    },
    [
      activeCountry,
      cancelCameraFlight,
      cancelIntent,
      clusters,
      flight,
      focusCountryOnGlobe,
      focusLatLngOnGlobe,
      handleFlightActiveChange,
      lockExplicitRegion,
      mapMode,
      mapViewTransition,
      presentationMode,
      resolveCountryFlightDuration,
      setDisplayMode,
      syncRegionFocusForCountry,
    ],
  );

  const focusCountryOnMap = useCallback(
    (pick: MapCountry, source: Exclude<SelectionSource, null> = "mapTap") => {
      applyCountryIntent(pick, "focus", source);
    },
    [applyCountryIntent],
  );

  const openCountryPreview = useCallback(() => {
    setPresentationMode("preview");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setPresentationMode]);

  const advanceToCountryPreview = useCallback(
    (pick: MapCountry, source: Exclude<SelectionSource, null> = "shuffle") => {
      applyCountryIntent(pick, "preview", source);
    },
    [applyCountryIntent],
  );

  const clearCountryFocus = useCallback(() => {
    // Exiting country focus but staying in the continent — keep the pin around
    // as a normal flag so it doesn't blink out from under the camera.
    const deselectedName =
      useIdentityStore.getState().activeCountry?.name ?? null;
    cancelCameraFlight();
    resetMapPresentation();
    clearFocusTransition();
    clearActiveCountry();
    resetExperience();
    setLingeringDeselectedName(
      deselectedName && useMapUiStore.getState().focusedRegion
        ? deselectedName
        : null,
    );
  }, [
    cancelCameraFlight,
    clearActiveCountry,
    clearFocusTransition,
    resetExperience,
  ]);

  const showTapRipple = useCallback((coordinate: MapPressCoordinate) => {
    setTapRippleAt(coordinate);
    setTapRippleToken((token) => token + 1);
  }, []);

  const handleMapModeToggle = useCallback(() => {
    cancelIntent();
    if (mapMode === "3d") {
      pendingFlatFocusNameRef.current =
        activeCountryName ?? focusTransitionCountryName ?? null;
      pendingFlatPresentationModeRef.current = presentationMode;
      pendingGlobeFocusNameRef.current = null;
      pendingGlobeRegionFocusRef.current = null;
      setMapMode("2d");
      setMapViewTransition("enteringFlat");
      return;
    }

    const countryFocus =
      activeCountryName ?? focusTransitionCountryName ?? null;
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
    presentationMode,
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
    },
    [mapMode, mapViewTransition],
  );

  /** Live (throttled) flat viewport — feeds the camera zoom signal continuously. */
  const handleFlatRegionChange = useCallback((region: Region) => {
    flatLatitudeDeltaRef.current = region.latitudeDelta;
    setFlatLatitudeDelta(region.latitudeDelta);
    setLastMapRegion(region);
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      flatLatitudeDeltaRef.current = region.latitudeDelta;
      setFlatLatitudeDelta(region.latitudeDelta);
      setLastMapRegion(region);
      if (is3d) return;

      // During a programmatic flight the camera is mid-sequence — let it land
      // before running world-reset / region-switch settle logic.
      if (isMapAnimatingRef.current) return;

      const nextTier = resolveFlatZoomTier(region.latitudeDelta);
      const currentFocused = useMapUiStore.getState().focusedRegion;

      if (suppressWorldResetRef.current && nextTier !== "world") {
        suppressWorldResetRef.current = false;
      }

      if (nextTier === "world") {
        clearPendingRegionSwitch();
        if (!suppressWorldResetRef.current) {
          clearExplicitRegionLock();
          resetGlobalPulse();
          clearCountrySelection();
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
          resolveFlatZoomTier(flatLatitudeDeltaRef.current) === "world" ||
          pendingRegionCandidateRef.current !== nearestRegion
        ) {
          return;
        }
        setFocusedRegion(nearestRegion);
        pendingRegionCandidateRef.current = null;
        pendingRegionSwitchTimerRef.current = null;
      }, REGION_SWITCH_HYSTERESIS_MS);
    },
    [
      clearCountrySelection,
      clearExplicitRegionLock,
      clearPendingRegionSwitch,
      is3d,
      resetGlobalPulse,
      resolveNearestRegionByCenter,
      setDisplayMode,
      setFocusedRegion,
    ],
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
    const restoreMode = pendingFlatPresentationModeRef.current;
    pendingFlatPresentationModeRef.current = null;

    if (restoreMode === "preview") {
      setPresentationMode("preview");
    }

    focusCountryOnFlatMap(
      pick,
      650,
      wasActive || restoreMode === "preview" ? "country" : "continent",
    );
  }, [countries, focusCountryOnFlatMap, setMapMode, setPresentationMode]);

  const applyPendingExternalMapFocus = useCallback(() => {
    const intent = useMapStore.getState().pendingMapIntent;
    const mapState = useMapStore.getState();
    if (!intent || countries.length === 0) return;
    if (externalFocusAppliedRef.current === intent.countryName) return;

    // Wait for the full map dataset — applying while only an injected country
    // is present causes a marker storm mid-flight when the API response lands.
    if (!mapState.mapCountriesFullyLoaded) {
      logMapDebug("intent", "external focus deferred — countries loading", {
        countryName: intent.countryName,
        countriesCount: countries.length,
      });
      return;
    }

    const pick = countries.find((c) => c.name === intent.countryName) ?? null;
    if (!pick) {
      logMapDebug("intent", "external focus deferred — country not in list", {
        countryName: intent.countryName,
      });
      return;
    }

    const useGlobeCamera =
      mapMode === "3d" && mapViewTransition !== "enteringFlat";
    // The camera must be able to fly before we apply, or the move no-ops silently.
    if (!useGlobeCamera && !flatMapReadyRef.current) {
      logMapDebug("intent", "external focus deferred — flat map not ready", {
        countryName: intent.countryName,
      });
      return;
    }
    if (
      useGlobeCamera &&
      (mapViewTransition !== "ready" || !useMapStore.getState().globeCamera)
    ) {
      return;
    }

    externalFocusAppliedRef.current = intent.countryName;

    setActiveChip("all");
    setFeaturedShortcut(null);

    logMapDebug("intent", "applyPendingExternalMapFocus", {
      country: summarizeCountry(pick),
      source: intent.source,
      mode: intent.mode,
      mapCountriesFullyLoaded: mapState.mapCountriesFullyLoaded,
      countriesCount: countries.length,
    });

    // Intent is applied synchronously and the flight is interruptible, so the
    // cross-screen handoff can be cleared immediately.
    applyCountryIntent(pick, intent.mode, intent.source);
    clearPendingMapIntent();
  }, [
    applyCountryIntent,
    clearPendingMapIntent,
    countries,
    mapMode,
    mapViewTransition,
    setActiveChip,
    setFeaturedShortcut,
  ]);

  useEffect(() => {
    if (!pendingMapIntent) {
      externalFocusAppliedRef.current = null;
    }
  }, [pendingMapIntent]);

  useFocusEffect(
    useCallback(() => {
      applyPendingExternalMapFocus();
    }, [applyPendingExternalMapFocus]),
  );

  useEffect(() => {
    if (pendingMapIntent) {
      applyPendingExternalMapFocus();
    }
  }, [
    applyPendingExternalMapFocus,
    flatMapReadyToken,
    globeCamera,
    mapCountriesFullyLoaded,
    mapViewTransition,
    pendingMapIntent,
  ]);

  const handleCountryPress = useCallback(
    (country: MapCountry) => {
      if (activeCountry?.name === country.name && isPreviewOpen) {
        return;
      }
      if (activeCountry?.name === country.name) {
        openCountryPreview();
        return;
      }
      focusCountryOnMap(country, "mapTap");
    },
    [activeCountry?.name, focusCountryOnMap, isPreviewOpen, openCountryPreview],
  );

  const handleAllPress = useCallback(async () => {
    if (countries.length === 0) return;
    const generation = ++randomPickGenerationRef.current;
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
    if (generation !== randomPickGenerationRef.current) return;

    setActiveChip("all");
    setFeaturedShortcut("all");
    focusCountryOnMap(pick, "shuffle");
  }, [countries, focusCountryOnMap, setActiveChip, setFeaturedShortcut]);

  const handleTerrainPress = useCallback(async () => {
    if (countries.length === 0) return;
    const generation = ++randomPickGenerationRef.current;
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
    if (generation !== randomPickGenerationRef.current) return;

    setActiveChip("nature");
    setFeaturedShortcut("terrain");
    focusCountryOnMap(pick, "shuffle");
  }, [countries, focusCountryOnMap, setActiveChip, setFeaturedShortcut]);

  const handleSavedPress = useCallback(async () => {
    if (countries.length === 0) return;
    const generation = ++randomPickGenerationRef.current;
    const saved = useSavedCountriesStore.getState().savedCountries;
    const pick =
      saved
        .map((sc) => countries.find((c) => c.name === sc.name))
        .find(Boolean) ?? null;

    if (!pick) return;
    if (generation !== randomPickGenerationRef.current) return;

    setActiveChip("all");
    setFeaturedShortcut("saved");
    focusCountryOnMap(pick, "shuffle");
  }, [countries, focusCountryOnMap, setActiveChip, setFeaturedShortcut]);

  const handleRandomCountry = useCallback(async () => {
    // Block rapid taps: a flight in progress (or a tap within the cooldown)
    // would cancel-then-immediately-restart the camera, overlapping
    // animateToRegion calls and crashing react-native-maps on iOS.
    if (isMapAnimatingRef.current) {
      logMapDebug("fab", "tap ignored — flight in progress");
      return;
    }
    const now = Date.now();
    if (now - lastRandomFabTapAtRef.current < RANDOM_FAB_TAP_COOLDOWN_MS) {
      logMapDebug("fab", "tap ignored — cooldown", {
        sinceLastTapMs: now - lastRandomFabTapAtRef.current,
      });
      return;
    }
    lastRandomFabTapAtRef.current = now;

    if (!mapCountriesFullyLoaded) {
      logMapDebug("fab", "awaiting full country list");
      await loadMapCountries();
    }

    const countriesSnapshot = useMapStore.getState().countries;
    if (countriesSnapshot.length === 0) {
      logMapDebug("fab", "tap ignored — no countries loaded");
      return;
    }

    const generation = ++randomPickGenerationRef.current;
    logMapDebug("fab", "tap", {
      generation,
      countriesCount: countriesSnapshot.length,
      focusedRegion,
      activeChip,
      previousCountry: activeCountry?.name ?? null,
      isMapAnimating: isMapAnimatingRef.current,
    });

    // The FAB always draws from the GLOBAL pool. A focused continent only biases
    // the selection toward itself (it does not hard-scope), so featured shortcuts
    // and the regional restriction are intentionally ignored here.
    const pool = await buildMapRandomPool({
      countries: countriesSnapshot,
      activeChip,
      featuredShortcut: null,
      focusedRegion: null,
      useWorldPool: true,
    });
    if (generation !== randomPickGenerationRef.current) {
      logMapDebug("fab", "stale generation after pool", {
        generation,
        current: randomPickGenerationRef.current,
      });
      return;
    }

    const excludeName = activeCountry?.name ?? null;
    const pick = pickBiasedRandomMapCountry({
      pool,
      region: focusedRegion,
      excludeName,
    });
    if (!pick) {
      logMapDebug("fab", "no pick available", {
        generation,
        poolSize: pool.length,
      });
      return;
    }

    const pickLatLng = getMapDisplayLatLng(pick);
    logMapDebug("fab", "pick", {
      generation,
      country: summarizeCountry(pick),
      coordsValid: isValidLatLng(pickLatLng),
      poolSize: pool.length,
      focusedRegion,
      biasedToContinent: !!focusedRegion && pick.region === focusedRegion,
      isRepeat: pick.name === excludeName,
      excludeName,
    });

    const showHint = !hasSeenRandomCountryHint;
    focusCountryOnMap(pick, "fab");
    if (showHint) {
      setRandomCountryHint(pick);
      dismissRandomCountryHint();
    }
  }, [
    activeChip,
    activeCountry?.name,
    dismissRandomCountryHint,
    focusCountryOnMap,
    focusedRegion,
    hasSeenRandomCountryHint,
    loadMapCountries,
    mapCountriesFullyLoaded,
  ]);

  const handleNextCountry = useCallback(async () => {
    if (!activeCountry || countries.length === 0) return;

    const generation = ++shufflePickGenerationRef.current;
    setIsPreviewShufflePending(true);
    try {
      const pool = await buildMapRandomPool({
        countries,
        activeChip,
        featuredShortcut,
        focusedRegion,
        useWorldPool: resolveMapRandomUseWorldPool({
          focusedRegion,
          mapMode,
          flatLatitudeDelta: flatLatitudeDeltaRef.current,
          contextualOnly: true,
        }),
      });
      if (generation !== shufflePickGenerationRef.current) return;

      const pick =
        pickRandomMapCountry(pool, activeCountry.name) ??
        pickRandomMapCountry(countries, activeCountry.name);
      if (!pick) return;

      advanceToCountryPreview(pick);
    } finally {
      if (generation === shufflePickGenerationRef.current) {
        setIsPreviewShufflePending(false);
      }
    }
  }, [
    activeChip,
    activeCountry,
    advanceToCountryPreview,
    countries,
    featuredShortcut,
    focusedRegion,
    mapMode,
  ]);

  const flyToWorldView = useCallback(() => {
    cancelIntent();
    suppressWorldResetRef.current = false;
    clearExplicitRegionLock();
    resetGlobalPulse();
    clearCountrySelection();
    if (is3d) {
      cancelCameraFlight();
      mapRef.current?.resetWorldView();
    } else {
      flight.flyTo([{ region: WORLD_INITIAL_REGION, duration: 600 }]);
    }
  }, [
    cancelCameraFlight,
    cancelIntent,
    clearCountrySelection,
    clearExplicitRegionLock,
    flight,
    is3d,
    resetGlobalPulse,
  ]);

  const handleReset = useCallback(() => {
    flyToWorldView();
    setActiveChip("all");
  }, [flyToWorldView, setActiveChip]);

  const handleBackToWorld = useCallback(() => {
    flyToWorldView();
  }, [flyToWorldView]);

  const recenterOnFocusedContinent = useCallback(
    (cluster: MapCluster) => {
      const flightDuration = 650;

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

      flight.flyTo([{ region: focusRegion, duration: flightDuration }]);
    },
    [
      clearPendingRegionSwitch,
      flight,
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
      const cluster = clusters.find((c) => c.region === region);
      if (!cluster) return;

      cancelIntent();
      setFocusedRegion(region);
      suppressWorldResetRef.current = true;
      clearPendingRegionSwitch();
      lockExplicitRegion(cluster.region, cluster.center);

      const focusRegion = regionForClusterFocus(cluster);
      setLastMapRegion(focusRegion);

      if (is3d) {
        const [lat, lng] = cluster.center;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          focusLatLngOnGlobe(lat, lng, duration, GLOBE_REGION_CAMERA_DISTANCE);
        }
        return;
      }

      flight.flyTo([{ region: focusRegion, duration }]);
    },
    [
      cancelIntent,
      clearPendingRegionSwitch,
      clusters,
      flight,
      focusLatLngOnGlobe,
      is3d,
      lockExplicitRegion,
      setFocusedRegion,
    ],
  );

  /** Close preview sheet and keep the country focused (camera already there). */
  const dismissCountryPreview = useCallback(() => {
    cancelIntent();
    dismissMapPreview();
    setPreviewDismissToContinent(false);
    clearFocusTransition();
  }, [cancelIntent, clearFocusTransition]);

  /** Preview "back to continent" — clears country selection and zooms to region. */
  const exitCountryPreviewToContinent = useCallback(() => {
    cancelIntent();
    const region = useMapUiStore.getState().focusedRegion;

    resetMapPresentation();
    setPreviewDismissToContinent(false);
    clearFocusTransition();
    clearActiveCountry();
    resetExperience();

    if (region) {
      zoomOutToContinentView(region, 650);
    }
  }, [
    cancelIntent,
    clearActiveCountry,
    clearFocusTransition,
    resetExperience,
    zoomOutToContinentView,
  ]);

  const handleMapPress = useCallback(
    (coordinate?: MapPressCoordinate) => {
      if (presentationMode === "preview") {
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

        if (is3d || cameraTier === "world") {
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
      cameraTier,
      clearCountryFocus,
      clusters,
      countries,
      dismissCountryPreview,
      focusedRegion,
      is3d,
      presentationMode,
      recenterOnFocusedContinent,
      requestContinentFocus,
      showTapRipple,
    ],
  );

  const showRegionChrome = !!focusedRegion && !activeCountry && !isPreviewOpen;
  const showCountryFocusPill = !!activeCountry && !isPreviewOpen;
  const showFlagToggle = mapMarkerCountries.length > 0;

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const countryChromeAboveTabGap = 4;
  const countryFocusPillBottom = 34;
  const countryChromeHeight = 44;
  const countryChromeGap = 24;
  const mapFabClearance = showRegionChrome ? 68 : 56;
  const mapFabBottom = showCountryFocusPill
    ? countryFocusPillBottom + countryChromeHeight + countryChromeGap
    : regionChromeBottom + mapFabClearance;
  const randomHintBottom = mapFabBottom + 72;
  const previewBottomOffset = 0;
  const previewSheetBottomInset = insets.bottom;
  const onboardingBottom = Math.max(insets.bottom, 16) + 88;
  const showOnboarding =
    !hasSeenMapOnboarding &&
    (is3d || cameraTier === "world") &&
    status !== "loading" &&
    countries.length > 0 &&
    activeCountry === null &&
    focusTransitionCountryName === null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <MapCanvas
        ref={mapRef}
        onFlatMapReady={handleFlatMapReady}
        countries={mapMarkersForCanvas}
        boundaryCountries={countries}
        clusters={clusters}
        selectedName={selectedMapName}
        focusTransitionName={focusTransitionCountryName}
        focusedRegion={focusedRegion}
        previewRegion={previewRegion}
        tapRippleAt={tapRippleAt}
        tapRippleToken={tapRippleToken}
        zoomTier={is3d ? "region" : cameraTier}
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
        onFlatRegionChange={handleFlatRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {isPreviewOpen ? (
          <View style={styles.previewDim} pointerEvents="none" />
        ) : null}

        {!isPreviewOpen ? (
          <>
            <MapTopChromeScrim paddingTop={insets.top + 12} />
            <View
              pointerEvents="box-none"
              className="gap-1.5"
              style={{ paddingTop: insets.top + 12, zIndex: 1 }}
            >
              <MapSearchRow />
              {is3d || cameraTier === "world" || !focusedRegion ? (
                <MapFeaturedChips
                  onAllPress={() => void handleAllPress()}
                  onTerrainPress={() => void handleTerrainPress()}
                  onSavedPress={() => void handleSavedPress()}
                />
              ) : (
                <MapFilterChips />
              )}
            </View>
          </>
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
                PREVIEW_CONTINENT_BACK_ENABLED &&
                previewDismissToContinent &&
                focusedRegion
                  ? exitCountryPreviewToContinent
                  : undefined
              }
              backToRegionLabel={
                PREVIEW_CONTINENT_BACK_ENABLED && focusedRegion
                  ? continentDisplayLabel(focusedRegion)
                  : undefined
              }
              onNextCountry={() => void handleNextCountry()}
              isNextCountryLoading={isPreviewShufflePending}
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
            onOpenDetails={openCountryPreview}
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
              bottom={mapFabBottom}
              keepCollapsed={showCountryFocusPill}
              onRandomCountryPress={() => void handleRandomCountry()}
              randomDeemphasized={showCountryFocusPill}
              randomDisabled={isMapAnimating}
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
