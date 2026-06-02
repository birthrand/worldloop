import * as Haptics from "expo-haptics";
import { useFocusEffect, useNavigation } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { InteractionManager } from "react-native";
import type { Region } from "react-native-maps";

import { type GlobeCameraViewState } from "@/components/map/globe-view";
import { type MapCanvasHandle } from "@/components/map/map-canvas";
import { syncFillEnabledToContinentOverlay } from "@/constants/map-boundary-style";
import {
  regionForMapCountry,
  WORLD_INITIAL_REGION,
} from "@/constants/map-regions";
import { useContinentIntent } from "@/hooks/use-continent-intent";
import { useMapFlight } from "@/hooks/use-map-flight";
import {
  CROSS_REGION_OVERLAY_LAG_MS,
  CROSS_REGION_REVEAL_EXTRA_DELAY_MS,
  MARKER_REGION_SWAP_CLEAR_DELAY_MS,
  useMapMarkerReveal,
} from "@/hooks/use-map-marker-reveal";
import { logGlobeTap } from "@/lib/globe-tap-debug";
import {
  deriveCameraZoomState,
  resolveGlobeDistanceFromLatitudeDelta,
} from "@/lib/map-camera-zoom";
import { buildMapClusters, type MapCluster } from "@/lib/map-clusters";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import { getCountryBoundaryPolygons } from "@/lib/map-country-boundaries";
import { summarizeRegion } from "@/lib/map-debug";
import { buildDiscoveryPhases } from "@/lib/map-discovery-flight";
import { resolveExternalMapFocusEligibility } from "@/lib/map-external-focus";
import {
  findClusterAtWorldCoordinate,
  resolveGlobeSurfaceTapCountry,
  resolveMapCountryAtCoordinate,
  type MapPressCoordinate,
} from "@/lib/map-map-tap-hit";
import {
  resolveFlatTransitionRestore,
  resolveMapModeTogglePending,
} from "@/lib/map-mode-transition";
import {
  isCountryPreviewOpen,
  showCountryFocusPill,
  showRegionChrome,
} from "@/lib/map-presentation";
import {
  commitMapPresentation,
  dismissMapPreview,
  resetMapPresentation,
} from "@/lib/map-presentation-transition";
import {
  isRandomPickGenerationCurrent,
  shouldAcceptRandomFabTap,
} from "@/lib/map-random-fab";
import {
  buildMapRandomPool,
  pickRandomMapCountry,
  resolveMapRandomUseWorldPool,
} from "@/lib/map-random-pick";
import {
  shouldSyncFocusedRegionForCountry,
  shouldSyncFocusedRegionForSelectionSource,
  syncMapRegionFocusForCountry,
} from "@/lib/map-region-focus";
import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
  GLOBE_WORLD_CAMERA_DISTANCE,
  REGION_FOCUS_INITIAL_DELTA,
  resolveGlobeCountryTargetDistance,
  resolveRegionMarkerCountries,
} from "@/lib/map-region-markers";
import {
  REGION_SWITCH_HYSTERESIS_MS,
  resolveRegionSettleDecision,
  shouldCommitScheduledRegionSwitch,
} from "@/lib/map-region-settle";
import {
  canFocusContinentFromMapTap,
  canRefocusContinentFromMapTap,
  flightRegionForClusterFocus,
  shouldDelegateMapTapToCountrySelection,
  shouldSelectCountryAcrossFocusedContinentFromMapTap,
  shouldSelectCountryInFocusedContinentFromMapTap,
  shouldShowFeaturedChipsInMapChrome,
  shouldShowMapOnboarding,
} from "@/lib/map-signal-sources";
import {
  isGlobeMapUi,
  resolveStableMapViewTransition,
  syncMapViewTransitionForMode,
  type MapViewTransition,
} from "@/lib/map-view-transition";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useExperienceStore } from "@/store/use-experience-store";
import {
  useIdentityStore,
  type SelectionSource,
} from "@/store/use-identity-store";
import { useMapPresentationStore } from "@/store/use-map-presentation-store";
import {
  filterMapCountriesByChip,
  useMapStore,
  type MapMode,
} from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

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

export function useMapLogic(mapRef: RefObject<MapCanvasHandle | null>) {
  const navigation = useNavigation();
  /** True while a programmatic camera flight is sequencing (controller-driven). */
  const isMapAnimatingRef = useRef(false);
  const [isMapAnimating, setIsMapAnimating] = useState(false);
  /** Supersedes stale async random/shuffle pool resolutions when taps overlap. */
  const randomPickGenerationRef = useRef(0);
  /** Timestamp of the last accepted random-FAB tap — throttles rapid taps. */
  const lastRandomFabTapAtRef = useRef(0);
  const lastShuffleTapAtRef = useRef(0);
  const shufflePickGenerationRef = useRef(0);
  /** Monotonic id — only the latest navigation intent may drive the camera. */
  const navigationIntentIdRef = useRef(0);
  const pendingExploreRegionSyncRef = useRef<MapCountry | null>(null);
  const exploreHandoffSuppressMarkersRef = useRef(false);
  const [exploreHandoffSuppressMarkers, setExploreHandoffSuppressMarkers] =
    useState(false);
  const [markerPrepareSwapToken, setMarkerPrepareSwapToken] = useState(0);
  const [suppressMarkersForRegionSwap, setSuppressMarkersForRegionSwap] =
    useState(false);
  /** Keeps marker reveal frozen until deferred focusedRegion commits (2D cross-region). */
  const [holdRevealForCrossRegion, setHoldRevealForCrossRegion] =
    useState(false);
  const [markerRegionClearDelayMs, setMarkerRegionClearDelayMs] = useState(
    MARKER_REGION_SWAP_CLEAR_DELAY_MS,
  );
  /** Defers focusedRegion commit until marker removal has settled (2D cross-region). */
  const continentNavSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /**
   * 2D cross-region continent nav: fly first, commit focusedRegion only after
   * the camera settles. Updating focusedRegion during animateToRegion remounts
   * continent polygons and crashes react-native-maps on iOS.
   */
  const pendingCrossRegionFocusRef = useRef<{
    cluster: MapCluster;
    intentId: number;
  } | null>(null);
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
  /** Paired with `pendingGlobeFocusNameRef` — same framing as immediate `applyCountryIntent`. */
  const pendingGlobeFocusDistanceRef = useRef<number | undefined>(undefined);
  /** Continent to center on the globe after 2D → 3D when no country is selected. */
  const pendingGlobeRegionFocusRef = useRef<string | null>(null);
  /** Apply flat-map zoom/center to the globe after 2D → 3D with no pending country/continent flight. */
  const pendingGlobeViewportSyncRef = useRef(false);
  /** Country to focus on the 2D map after 3D → 2D crossfade completes. */
  const pendingFlatFocusNameRef = useRef<string | null>(null);
  /** Presentation mode to restore after 3D → 2D crossfade completes. */
  const pendingFlatPresentationModeRef = useRef<MapPresentationMode | null>(
    null,
  );
  /** Map mode when preview opened — restored on dismiss if it drifted. */
  const mapModeAtPreviewOpenRef = useRef<MapMode | null>(null);
  const prevPreviewOpenRef = useRef(false);
  /** Prevents duplicate external-focus camera flights from focus + effect racing. */
  const externalFocusAppliedRef = useRef<string | null>(null);
  /** 2D MapView is interactive — external flights must wait or they no-op silently. */
  const flatMapReadyRef = useRef(false);
  const [flatMapReadyToken, setFlatMapReadyToken] = useState(0);
  /** Live flat-map zoom (latitudeDelta) — synchronous reads for callbacks. */
  const flatLatitudeDeltaRef = useRef(WORLD_INITIAL_REGION.latitudeDelta);
  /** Live globe distance — synchronous reads for region settle on 3D. */
  const globeCameraDistanceRef = useRef(GLOBE_WORLD_CAMERA_DISTANCE);
  /** Settles globe focuses (3D camera move isn't tracked by the flat controller). */
  const globeSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Debounced region settle when the globe camera stops moving (2D parity). */
  const globeRegionSettleTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
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
  /** Lags continent focus polygons behind focusedRegion after cross-region flights. */
  const [continentOverlayRegion, setContinentOverlayRegion] = useState<
    string | null
  >(focusedRegion);
  const continentOverlayLagTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const setDisplayMode = useMapUiStore((s) => s.setDisplayMode);
  const setFocusedRegion = useMapUiStore((s) => s.setFocusedRegion);
  const setFeaturedShortcut = useMapUiStore((s) => s.setFeaturedShortcut);
  const setBoundaryStyle = useMapUiStore((s) => s.setBoundaryStyle);
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

  const [mapViewTransition, setMapViewTransition] = useState<MapViewTransition>(
    () => resolveStableMapViewTransition(useMapStore.getState().mapMode),
  );
  const [isPreviewShufflePending, setIsPreviewShufflePending] = useState(false);
  const [flatLatitudeDelta, setFlatLatitudeDelta] = useState(
    WORLD_INITIAL_REGION.latitudeDelta,
  );
  const [globeCameraDistance, setGlobeCameraDistance] = useState(
    GLOBE_WORLD_CAMERA_DISTANCE,
  );
  /** Seeds the 3D canvas distance when entering globe mode (2D latitudeDelta sync). */
  const [globeEntryCameraDistance, setGlobeEntryCameraDistance] = useState(
    GLOBE_WORLD_CAMERA_DISTANCE,
  );
  const [globeViewCenter, setGlobeViewCenter] = useState({
    latitude: 0,
    longitude: -30,
  });
  const [lastMapRegion, setLastMapRegion] = useState(WORLD_INITIAL_REGION);
  const is3d = isGlobeMapUi(mapMode, mapViewTransition);

  useEffect(() => {
    const syncTransitionForMode = (mode: MapMode) => {
      setMapViewTransition((current) =>
        syncMapViewTransitionForMode(mode, current),
      );
    };

    syncTransitionForMode(useMapStore.getState().mapMode);

    return useMapStore.persist.onFinishHydration(() => {
      syncTransitionForMode(useMapStore.getState().mapMode);
    });
  }, []);

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

  useEffect(() => {
    globeCameraDistanceRef.current = globeCameraDistance;
  }, [globeCameraDistance]);

  const handleGlobeTransitionComplete = useCallback(() => {
    setMapViewTransition("ready");
  }, []);
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  const clusters = useMemo(() => buildMapClusters(countries), [countries]);

  const allBoundaryPolygons = getCountryBoundaryPolygons(countriesGeoJson);

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
      const focal = countries.find((c) => c.name === focalMarkerName) ?? null;
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
    // animateToRegion crashes react-native-maps on iOS. Also hold through the
    // gap after flyTo settles when focusedRegion is still deferred (cross-region).
    paused: !is3d && (isMapAnimating || holdRevealForCrossRegion),
    prepareSwapToken: markerPrepareSwapToken,
    regionClearDelayMs: markerRegionClearDelayMs,
  });

  useEffect(() => {
    if (continentOverlayLagTimerRef.current) return;
    setContinentOverlayRegion(focusedRegion);
  }, [focusedRegion]);

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
  const mapMarkersForCanvas = suppressMarkersForRegionSwap
    ? []
    : mapMarkerCountries;

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

  const selectedMapName = activeCountryName ?? focusTransitionCountryName;

  const isPreviewOpen = isCountryPreviewOpen(presentationMode, activeCountry);

  useEffect(() => {
    if (isPreviewOpen && !prevPreviewOpenRef.current) {
      mapModeAtPreviewOpenRef.current = mapMode;
    } else if (!isPreviewOpen && prevPreviewOpenRef.current) {
      mapModeAtPreviewOpenRef.current = null;
    }
    prevPreviewOpenRef.current = isPreviewOpen;
  }, [isPreviewOpen, mapMode]);

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

  /** Camera flight active-state — drives pulse end + per-marker snapshot smoothing. */
  const handleFlightActiveChange = useCallback(
    (active: boolean) => {
      isMapAnimatingRef.current = active;
      setIsMapAnimating(active);
      if (!active) {
        setIsPreviewShufflePending(false);
        setFocusTransitionCountryName(null);
        endExperienceTransition();
        setMarkerRefreshToken((token) => token + 1);

        if (exploreHandoffSuppressMarkersRef.current) {
          exploreHandoffSuppressMarkersRef.current = false;
          setExploreHandoffSuppressMarkers(false);
          const pending = pendingExploreRegionSyncRef.current;
          pendingExploreRegionSyncRef.current = null;
          if (pending) {
            syncMapRegionFocusForCountry(pending, { explicitFocus: true });
          }
        }
      }
    },
    [activeCountry?.name, endExperienceTransition, focusTransitionCountryName],
  );

  const flatAnimator = useCallback((region: Region, duration: number) => {
    const summary = summarizeRegion(region);
    if (!summary.finite) return;
    mapRef.current?.animateToRegion(region, duration);
  }, []);

  const flight = useMapFlight({
    animateToRegion: flatAnimator,
    onActiveChange: handleFlightActiveChange,
  });

  /** Stops flight timers without clearing animating (for retargeting). */
  const cancelFlightPhases = useCallback(() => {
    flight.cancel({ keepActive: true });
    if (globeSettleTimerRef.current) {
      clearTimeout(globeSettleTimerRef.current);
      globeSettleTimerRef.current = null;
    }
  }, [flight]);

  /** Stops any active flight (flat phases or globe settle) and clears the busy flag. */
  const cancelCameraFlight = useCallback(
    (options?: { keepAnimating?: boolean }) => {
      const keepAnimating = options?.keepAnimating === true;
      if (keepAnimating) {
        cancelFlightPhases();
      } else {
        flight.cancel();
        if (globeSettleTimerRef.current) {
          clearTimeout(globeSettleTimerRef.current);
          globeSettleTimerRef.current = null;
        }
        if (globeRegionSettleTimerRef.current) {
          clearTimeout(globeRegionSettleTimerRef.current);
          globeRegionSettleTimerRef.current = null;
        }
        isMapAnimatingRef.current = false;
        setIsMapAnimating(false);
      }
    },
    [cancelFlightPhases, flight],
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
    (
      pick: MapCountry,
      options?: {
        explicitFocus?: boolean;
        source?: Exclude<SelectionSource, null>;
      },
    ) => {
      const focusedRegion = useMapUiStore.getState().focusedRegion;
      const shouldSync =
        options?.explicitFocus !== undefined
          ? shouldSyncFocusedRegionForCountry(pick, focusedRegion, {
              explicitFocus: options.explicitFocus,
            })
          : options?.source
            ? shouldSyncFocusedRegionForSelectionSource(
                pick,
                focusedRegion,
                options.source,
              )
            : shouldSyncFocusedRegionForCountry(pick, focusedRegion);
      const synced = shouldSync
        ? syncMapRegionFocusForCountry(pick, { explicitFocus: true })
        : false;

      if (synced) {
        lockExplicitRegion(pick.region, getMapDisplayLatLng(pick));
      } else if (focusedRegion) {
        const cluster =
          clusters.find((cluster) => cluster.region === focusedRegion) ?? null;
        if (cluster) {
          lockExplicitRegion(focusedRegion, cluster.center);
        }
      }

      suppressWorldResetRef.current = true;
    },
    [clusters, lockExplicitRegion],
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
      if (continentNavSwapTimerRef.current) {
        clearTimeout(continentNavSwapTimerRef.current);
        continentNavSwapTimerRef.current = null;
      }
      pendingCrossRegionFocusRef.current = null;
      if (continentOverlayLagTimerRef.current) {
        clearTimeout(continentOverlayLagTimerRef.current);
        continentOverlayLagTimerRef.current = null;
      }
      setSuppressMarkersForRegionSwap(false);
      setHoldRevealForCrossRegion(false);
      flightCancelRef.current();
      if (globeSettleTimerRef.current) {
        clearTimeout(globeSettleTimerRef.current);
        globeSettleTimerRef.current = null;
      }
      if (globeRegionSettleTimerRef.current) {
        clearTimeout(globeRegionSettleTimerRef.current);
        globeRegionSettleTimerRef.current = null;
      }
      isMapAnimatingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional unmount-only cleanup
  }, []);

  const onContinentCommitRef = useRef<(cluster: MapCluster) => void>(() => {});

  const {
    previewRegion,
    requestContinentFocus: requestContinentFocusInner,
    cancelIntent,
  } = useContinentIntent({
    onCommit: (cluster) => onContinentCommitRef.current(cluster),
    focusedRegion,
  });

  const boundaryFocusRegion = focusedRegion ?? previewRegion;

  const requestContinentFocus = useCallback(
    (cluster: MapCluster) => {
      if (
        !canRefocusContinentFromMapTap(
          focusedRegion,
          cluster.region,
          cameraTier,
        )
      ) {
        return;
      }
      requestContinentFocusInner(cluster);
    },
    [cameraTier, focusedRegion, requestContinentFocusInner],
  );

  type ContinentNavOptions = {
    /** Default true. False for same-continent recenter. */
    updateFocusedRegion?: boolean;
    /** Default true. False when caller already cleared (preview exit). */
    clearSelection?: boolean;
    duration?: number;
    /** Optional globe camera distance (preview exit uses region framing). */
    globeDistance?: number;
    source?: string;
  };

  const commitContinentNavigation = useCallback(
    (cluster: MapCluster, options: ContinentNavOptions = {}) => {
      const {
        updateFocusedRegion = true,
        clearSelection = true,
        duration = 650,
        globeDistance,
        source = "unknown",
      } = options;

      navigationIntentIdRef.current += 1;
      const intentId = navigationIntentIdRef.current;
      pendingCrossRegionFocusRef.current = null;
      setHoldRevealForCrossRegion(false);
      setMarkerRegionClearDelayMs(MARKER_REGION_SWAP_CLEAR_DELAY_MS);

      cancelIntent();

      if (continentNavSwapTimerRef.current) {
        clearTimeout(continentNavSwapTimerRef.current);
        continentNavSwapTimerRef.current = null;
      }

      const previousRegion = useMapUiStore.getState().focusedRegion;
      const isCrossRegion2d =
        !is3d &&
        updateFocusedRegion &&
        previousRegion !== null &&
        previousRegion !== cluster.region;

      if (clearSelection) {
        clearCountrySelection();
        setFeaturedShortcut(null);
      }
      setDisplayMode("explore");
      suppressWorldResetRef.current = true;
      clearPendingRegionSwitch();

      const focusRegion = flightRegionForClusterFocus(cluster);

      const commitRegionAndFly = () => {
        if (navigationIntentIdRef.current !== intentId) {
          return;
        }

        isMapAnimatingRef.current = true;
        setIsMapAnimating(true);

        const commitFocusedRegion = () => {
          if (!updateFocusedRegion) return;
          if (navigationIntentIdRef.current !== intentId) return;
          const pending = pendingCrossRegionFocusRef.current;
          if (pending && pending.intentId !== intentId) return;
          const afterCrossRegionFlight = !!pending;
          pendingCrossRegionFocusRef.current = null;
          setSuppressMarkersForRegionSwap(false);
          setHoldRevealForCrossRegion(false);
          setFocusedRegion(cluster.region);

          if (afterCrossRegionFlight) {
            setMarkerRegionClearDelayMs(
              MARKER_REGION_SWAP_CLEAR_DELAY_MS +
                CROSS_REGION_REVEAL_EXTRA_DELAY_MS,
            );
            if (continentOverlayLagTimerRef.current) {
              clearTimeout(continentOverlayLagTimerRef.current);
            }
            continentOverlayLagTimerRef.current = setTimeout(() => {
              continentOverlayLagTimerRef.current = null;
              setContinentOverlayRegion(cluster.region);
            }, CROSS_REGION_OVERLAY_LAG_MS);
            return;
          }

          if (continentOverlayLagTimerRef.current) {
            clearTimeout(continentOverlayLagTimerRef.current);
            continentOverlayLagTimerRef.current = null;
          }
          setContinentOverlayRegion(cluster.region);
        };

        // Commit focusedRegion BEFORE the flight (transaction order:
        // focusedRegion → reveal reset → flyTo), exactly like country nav. This
        // remounts continent polygons in their own commit, never overlapping the
        // animateToRegion that follows on the next interaction frame. Cross-region
        // markers were already cleared by the prepare-swap token, so committing
        // here cannot churn pins against the camera move.
        if (updateFocusedRegion) {
          commitFocusedRegion();
        }

        lockExplicitRegion(cluster.region, cluster.center);
        setLastMapRegion(focusRegion);

        if (is3d) {
          if (globeSettleTimerRef.current) {
            clearTimeout(globeSettleTimerRef.current);
          }
          globeSettleTimerRef.current = setTimeout(() => {
            globeSettleTimerRef.current = null;
            handleFlightActiveChange(false);
          }, duration + 300);

          const [lat, lng] = cluster.center;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const resolvedDistance =
              globeDistance ?? GLOBE_REGION_CAMERA_DISTANCE;
            focusLatLngOnGlobe(lat, lng, duration, resolvedDistance);
          }
          return;
        }

        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            if (navigationIntentIdRef.current !== intentId) {
              return;
            }
            flight.flyTo([{ region: focusRegion, duration }]);
          });
        });
      };

      if (isCrossRegion2d) {
        pendingCrossRegionFocusRef.current = { cluster, intentId };
        setHoldRevealForCrossRegion(true);
        setSuppressMarkersForRegionSwap(true);
        // Continent retargets must keep animating=true — firing animating=false
        // here unpauses the reveal mid-swap and resurrects the stale region's pins.
        cancelCameraFlight({ keepAnimating: true });
        isMapAnimatingRef.current = true;
        setIsMapAnimating(true);
        setMarkerPrepareSwapToken((token) => token + 1);

        continentNavSwapTimerRef.current = setTimeout(() => {
          continentNavSwapTimerRef.current = null;
          commitRegionAndFly();
        }, MARKER_REGION_SWAP_CLEAR_DELAY_MS);
        return;
      }

      isMapAnimatingRef.current = true;
      setIsMapAnimating(true);
      cancelCameraFlight({ keepAnimating: true });
      commitRegionAndFly();
    },
    [
      cancelCameraFlight,
      cancelIntent,
      clearCountrySelection,
      clearPendingRegionSwitch,
      flight,
      focusLatLngOnGlobe,
      handleFlightActiveChange,
      is3d,
      lockExplicitRegion,
      setDisplayMode,
      setFeaturedShortcut,
      setFocusedRegion,
    ],
  );

  const commitClusterFocus = useCallback(
    (cluster: MapCluster) => {
      commitContinentNavigation(cluster, { source: "cluster" });
    },
    [commitContinentNavigation],
  );

  onContinentCommitRef.current = commitClusterFocus;

  // Migrate legacy overlay fill color when continent focus/preview is active.
  useEffect(() => {
    const { boundaryStyle } = useMapUiStore.getState();
    const nextStyle = syncFillEnabledToContinentOverlay(
      focusedRegion,
      previewRegion,
      boundaryStyle,
    );
    if (nextStyle) {
      setBoundaryStyle(nextStyle);
    }
  }, [focusedRegion, previewRegion, setBoundaryStyle]);

  const resolveCountryFlightDuration = useCallback(
    (source: Exclude<SelectionSource, null>, useGlobeCamera: boolean) => {
      if (source === "explore" || source === "fab") {
        return useGlobeCamera ? 1400 : 900;
      }
      const baseDuration =
        source === "mapTap" ? (useGlobeCamera ? 450 : 500) : 650;
      return useGlobeCamera ? Math.max(baseDuration, 1100) : baseDuration;
    },
    [],
  );

  const armGlobeFlightAnimation = useCallback(
    (durationMs: number) => {
      isMapAnimatingRef.current = true;
      setIsMapAnimating(true);
      if (globeSettleTimerRef.current) {
        clearTimeout(globeSettleTimerRef.current);
      }
      globeSettleTimerRef.current = setTimeout(() => {
        globeSettleTimerRef.current = null;
        handleFlightActiveChange(false);
      }, durationMs + 300);
    },
    [handleFlightActiveChange],
  );

  /** 3D: rotate world + zoom to a country or continent frame (fixed camera). */
  const flyGlobeToCountryFrame = useCallback(
    (country: MapCountry, targetDistance: number, durationMs = 650) => {
      if (mapMode !== "3d" || mapViewTransition !== "ready") {
        return;
      }
      const [lat, lng] = getMapDisplayLatLng(country);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      armGlobeFlightAnimation(durationMs);
      focusLatLngOnGlobe(lat, lng, durationMs, targetDistance);
    },
    [armGlobeFlightAnimation, focusLatLngOnGlobe, mapMode, mapViewTransition],
  );

  const GLOBE_MODE_TOGGLE_FLIGHT_MS = 900;

  /** After 2D → 3D: country focus, continent focus (region distance), or flat zoom sync. */
  useEffect(() => {
    if (mapMode !== "3d" || mapViewTransition !== "ready" || !globeCamera) {
      return;
    }

    const flatDelta = flatLatitudeDeltaRef.current;

    const focusName = pendingGlobeFocusNameRef.current;
    if (focusName) {
      const targetDistance =
        pendingGlobeFocusDistanceRef.current ??
        resolveGlobeDistanceFromLatitudeDelta(flatDelta);
      pendingGlobeFocusNameRef.current = null;
      pendingGlobeFocusDistanceRef.current = undefined;
      pendingGlobeRegionFocusRef.current = null;
      pendingGlobeViewportSyncRef.current = false;

      const pick = countries.find((c) => c.name === focusName) ?? null;
      if (pick) {
        const [lat, lng] = getMapDisplayLatLng(pick);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          armGlobeFlightAnimation(GLOBE_MODE_TOGGLE_FLIGHT_MS);
          setGlobeCameraDistance(targetDistance);
          focusLatLngOnGlobe(
            lat,
            lng,
            GLOBE_MODE_TOGGLE_FLIGHT_MS,
            targetDistance,
          );
        }
      }
      return;
    }

    const focusRegion = pendingGlobeRegionFocusRef.current;
    if (focusRegion) {
      const cluster = clusters.find((c) => c.region === focusRegion) ?? null;
      pendingGlobeRegionFocusRef.current = null;
      pendingGlobeViewportSyncRef.current = false;

      if (cluster) {
        const [lat, lng] = cluster.center;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const targetDistance = GLOBE_REGION_CAMERA_DISTANCE;
          armGlobeFlightAnimation(GLOBE_MODE_TOGGLE_FLIGHT_MS);
          setGlobeCameraDistance(targetDistance);
          focusLatLngOnGlobe(
            lat,
            lng,
            GLOBE_MODE_TOGGLE_FLIGHT_MS,
            targetDistance,
          );
        }
      }
      return;
    }

    if (!pendingGlobeViewportSyncRef.current) {
      return;
    }
    pendingGlobeViewportSyncRef.current = false;

    const targetDistance = resolveGlobeDistanceFromLatitudeDelta(flatDelta);
    const { latitude, longitude } = lastMapRegion;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const viewportFlightMs = 600;
    armGlobeFlightAnimation(viewportFlightMs);
    setGlobeCameraDistance(targetDistance);
    focusLatLngOnGlobe(latitude, longitude, viewportFlightMs, targetDistance);
  }, [
    armGlobeFlightAnimation,
    clusters,
    countries,
    focusLatLngOnGlobe,
    globeCamera,
    lastMapRegion,
    mapMode,
    mapViewTransition,
  ]);

  /** 2D hybridFlyover / Android standard — animateToRegion framing. */
  const flyFlatToCountryFrame = useCallback(
    (
      country: MapCountry,
      framing: "continent" | "country",
      durationMs = 650,
    ) => {
      if (is3d || !flatMapReadyRef.current) {
        return;
      }
      isMapAnimatingRef.current = true;
      setIsMapAnimating(true);
      suppressWorldResetRef.current = true;
      const focusedRegion = useMapUiStore.getState().focusedRegion;
      if (shouldSyncFocusedRegionForCountry(country, focusedRegion)) {
        syncMapRegionFocusForCountry(country);
      }

      const region =
        framing === "continent"
          ? regionForMapCountry(country, REGION_FOCUS_INITIAL_DELTA)
          : regionForMapCountry(country);

      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          flight.flyTo([{ region, duration: durationMs }]);
        });
      });
    },
    [flight, is3d, syncMapRegionFocusForCountry],
  );

  /** Preview/detail vs continent framing — works in 2D (hybridFlyover) and 3D. */
  const flyMapToCountryFrame = useCallback(
    (
      country: MapCountry,
      framing: "continent" | "country",
      durationMs = 650,
    ) => {
      if (is3d) {
        const targetDistance =
          framing === "country"
            ? GLOBE_DETAIL_CAMERA_DISTANCE
            : GLOBE_REGION_CAMERA_DISTANCE;
        flyGlobeToCountryFrame(country, targetDistance, durationMs);
        return;
      }
      flyFlatToCountryFrame(country, framing, durationMs);
    },
    [flyFlatToCountryFrame, flyGlobeToCountryFrame, is3d],
  );

  const handleFlatMapReady = useCallback(() => {
    if (flatMapReadyRef.current) return;
    flatMapReadyRef.current = true;
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
      cancelIntent();
      isMapAnimatingRef.current = true;
      setIsMapAnimating(true);
      cancelCameraFlight({ keepAnimating: true });
      // A fresh focus supersedes any lingering deselected pin.
      setLingeringDeselectedName(null);

      if (source === "fab") {
        setFocusedRegion(null);
        setContinentOverlayRegion(null);
        setDisplayMode("globalPulse");
        clearExplicitRegionLock();
      }

      // "Back to continent" is offered only when we were already exploring a region.
      setPreviewDismissToContinent(
        source !== "explore" &&
          source !== "fab" &&
          !!useMapUiStore.getState().focusedRegion,
      );
      if (source !== "explore" && source !== "fab") {
        setDisplayMode("explore");
      }

      // Intent commits synchronously — focus pill / preview update right away.
      commitMapPresentation({
        country: pick,
        mode,
        source,
      });
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
      } else if (source !== "fab") {
        syncRegionFocusForCountry(pick, { source });
      }

      if (useGlobeCamera) {
        const globeDuration = resolveCountryFlightDuration(source, true);
        // The flat flight controller doesn't drive the globe — track the
        // settle window manually so pulse/transition end like a flat flight.
        if (globeSettleTimerRef.current) {
          clearTimeout(globeSettleTimerRef.current);
        }
        globeSettleTimerRef.current = setTimeout(() => {
          globeSettleTimerRef.current = null;
          handleFlightActiveChange(false);
        }, globeDuration + 300);

        const targetDistance = resolveGlobeCountryTargetDistance(
          mode,
          source,
          globeCameraDistance,
        );

        if (
          mapViewTransition !== "ready" ||
          !useMapStore.getState().globeCamera
        ) {
          pendingGlobeFocusNameRef.current = pick.name;
          pendingGlobeFocusDistanceRef.current = targetDistance;
          return;
        }
        const [lat, lng] = getMapDisplayLatLng(pick);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          focusLatLngOnGlobe(lat, lng, globeDuration, targetDistance);
        }
        return;
      }

      const cluster = clusters.find((c) => c.region === pick.region) ?? null;
      const phases = buildDiscoveryPhases({
        pick,
        cluster,
        source,
        includeWorld: source === "search",
        mode,
      });

      // Defer the camera move until React has committed this intent's marker
      // changes (paused reveal + new selection). Starting animateToRegion in the
      // same frame as a marker mount crashes iOS maps.
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          if (navigationIntentIdRef.current !== intentId) {
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
      clearExplicitRegionLock,
      clusters,
      flight,
      focusLatLngOnGlobe,
      globeCameraDistance,
      handleFlightActiveChange,
      lockExplicitRegion,
      mapMode,
      mapViewTransition,
      resolveCountryFlightDuration,
      setDisplayMode,
      setFocusedRegion,
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
    const country = useIdentityStore.getState().activeCountry;
    setPresentationMode("preview");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (country) {
      // Match 2D preview open — quick country framing, not the long globe flight.
      flyMapToCountryFrame(country, "country", 520);
    }
  }, [flyMapToCountryFrame, setPresentationMode]);

  /** Preview sheet only — keeps the current viewport zoom and pan. */
  const openCountryPreviewAtViewport = useCallback(() => {
    setPresentationMode("preview");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setPresentationMode]);

  /** 2D: select at current viewport. 3D: rotate globe to center the country (keep zoom). */
  const selectCountryAtViewport = useCallback(
    (pick: MapCountry) => {
      cancelIntent();
      cancelCameraFlight();
      setLingeringDeselectedName(null);
      setPreviewDismissToContinent(!!useMapUiStore.getState().focusedRegion);
      setDisplayMode("explore");
      commitMapPresentation({
        country: pick,
        mode: "focus",
        source: "mapTap",
      });
      syncRegionFocusForCountry(pick);
      clearFocusTransition();
      endExperienceTransition();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const useGlobeCamera =
        mapMode === "3d" && mapViewTransition !== "enteringFlat";
      if (!useGlobeCamera) {
        isMapAnimatingRef.current = false;
        setIsMapAnimating(false);
        return;
      }

      const panDuration = resolveCountryFlightDuration("mapTap", true);
      const [lat, lng] = getMapDisplayLatLng(pick);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        isMapAnimatingRef.current = false;
        setIsMapAnimating(false);
        return;
      }

      if (
        mapViewTransition !== "ready" ||
        !useMapStore.getState().globeCamera
      ) {
        pendingGlobeFocusNameRef.current = pick.name;
        pendingGlobeFocusDistanceRef.current = globeCameraDistance;
        return;
      }

      armGlobeFlightAnimation(panDuration);
      focusLatLngOnGlobe(lat, lng, panDuration, undefined);
    },
    [
      armGlobeFlightAnimation,
      cancelCameraFlight,
      cancelIntent,
      clearFocusTransition,
      endExperienceTransition,
      focusLatLngOnGlobe,
      globeCameraDistance,
      mapMode,
      mapViewTransition,
      resolveCountryFlightDuration,
      setDisplayMode,
      syncRegionFocusForCountry,
    ],
  );

  const handleBoundaryCountryPress = useCallback(
    (country: MapCountry) => {
      const isSelected = activeCountry?.name === country.name;

      if (isSelected && isPreviewOpen) {
        if (is3d) {
          logGlobeTap({
            source: "controller",
            stage: "skip",
            outcome: "preview-already-open",
            country: country.name,
            region: country.region,
            focusedRegion,
            boundaryFocusRegion,
            cameraTier,
            globeDistance: globeCameraDistance,
          });
        }
        return;
      }
      if (isSelected) {
        if (is3d) {
          logGlobeTap({
            source: "controller",
            stage: "action",
            outcome: "open-preview",
            country: country.name,
            region: country.region,
            focusedRegion,
            boundaryFocusRegion,
            cameraTier,
            globeDistance: globeCameraDistance,
          });
        }
        openCountryPreviewAtViewport();
        return;
      }
      if (is3d) {
        logGlobeTap({
          source: "controller",
          stage: "action",
          outcome: "select-country",
          country: country.name,
          region: country.region,
          focusedRegion,
          boundaryFocusRegion,
          cameraTier,
          globeDistance: globeCameraDistance,
        });
      }
      selectCountryAtViewport(country);
    },
    [
      activeCountry,
      boundaryFocusRegion,
      cameraTier,
      focusedRegion,
      globeCameraDistance,
      is3d,
      isPreviewOpen,
      openCountryPreviewAtViewport,
      selectCountryAtViewport,
    ],
  );

  const advanceToCountryPreview = useCallback(
    (pick: MapCountry, source: Exclude<SelectionSource, null> = "shuffle") => {
      applyCountryIntent(pick, "preview", source);
    },
    [applyCountryIntent],
  );

  const clearCountryFocus = useCallback(() => {
    // Exiting country focus but staying in the continent — keep the pin around
    // as a normal flag so it doesn't blink out from under the camera.
    const currentCountry = useIdentityStore.getState().activeCountry;
    const deselectedName = currentCountry?.name ?? null;

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
    const pending = resolveMapModeTogglePending({
      currentMode: mapMode,
      activeCountryName,
      focusTransitionCountryName,
      focusedRegion,
      presentationMode,
    });

    pendingFlatFocusNameRef.current = pending.pendingFlatFocusName;
    pendingFlatPresentationModeRef.current =
      pending.pendingFlatPresentationMode;
    pendingGlobeFocusNameRef.current = pending.pendingGlobeFocusName;
    pendingGlobeRegionFocusRef.current = pending.pendingGlobeRegionFocus;
    pendingGlobeViewportSyncRef.current =
      mapMode === "2d" &&
      !pending.pendingGlobeFocusName &&
      !pending.pendingGlobeRegionFocus;

    if (mapMode === "2d") {
      const entryDistance = resolveGlobeDistanceFromLatitudeDelta(
        flatLatitudeDeltaRef.current,
      );
      setGlobeEntryCameraDistance(entryDistance);
      setGlobeCameraDistance(entryDistance);
    }

    if (mapMode === "3d") {
      setMapMode("2d");
      setMapViewTransition("enteringFlat");
      return;
    }

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

  /** Shared flat/globe region settle — commits focusedRegion after explore-tier pan/zoom. */
  const applyRegionSettleFromViewport = useCallback(
    (viewport: {
      mapCenter: { latitude: number; longitude: number };
      latitudeDelta?: number;
      globeDistance?: number;
      useGlobeDistance?: boolean;
      settleEnabled: boolean;
    }) => {
      const decision = resolveRegionSettleDecision({
        latitudeDelta: viewport.latitudeDelta ?? flatLatitudeDeltaRef.current,
        globeDistance: viewport.globeDistance ?? globeCameraDistanceRef.current,
        useGlobeDistance: viewport.useGlobeDistance ?? false,
        mapCenter: viewport.mapCenter,
        settleEnabled: viewport.settleEnabled,
        isMapAnimating: isMapAnimatingRef.current,
        suppressWorldReset: suppressWorldResetRef.current,
        explicitLock: explicitRegionLockRef.current,
        currentFocusedRegion: useMapUiStore.getState().focusedRegion,
        nearestRegion: resolveNearestRegionByLatLng(
          viewport.mapCenter.latitude,
          viewport.mapCenter.longitude,
        ),
        pendingCandidate: pendingRegionCandidateRef.current,
      });

      if (decision.kind === "skip") {
        return;
      }

      if (decision.kind === "world_tier") {
        clearPendingRegionSwitch();
        if (decision.resetWorld) {
          clearExplicitRegionLock();
          resetGlobalPulse();
          clearCountrySelection();
        }
        return;
      }

      if (decision.clearSuppressWorldReset) {
        suppressWorldResetRef.current = false;
      }

      if (decision.setExploreMode) {
        setDisplayMode("explore");
      }

      if (decision.releaseExplicitLock) {
        explicitRegionLockRef.current = null;
      }

      if (decision.holdExplicitLock || !decision.nearestRegion) {
        if (decision.clearPending) {
          clearPendingRegionSwitch();
        }
        return;
      }

      if (decision.keepPendingCandidate) {
        return;
      }

      if (decision.clearPending) {
        clearPendingRegionSwitch();
      }

      if (!decision.scheduleRegionSwitch) {
        return;
      }

      const nearestRegion = decision.scheduleRegionSwitch;
      pendingRegionCandidateRef.current = nearestRegion;
      pendingRegionSwitchTimerRef.current = setTimeout(() => {
        if (
          !shouldCommitScheduledRegionSwitch({
            latitudeDelta: flatLatitudeDeltaRef.current,
            globeDistance: globeCameraDistanceRef.current,
            useGlobeDistance: viewport.useGlobeDistance ?? false,
            pendingCandidate: pendingRegionCandidateRef.current,
            expectedRegion: nearestRegion,
          })
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
      resetGlobalPulse,
      resolveNearestRegionByLatLng,
      setDisplayMode,
      setFocusedRegion,
    ],
  );

  /** Globe camera updates zoom/detail only — continent exploration stays in UI store until explicit exit. */
  const handleGlobeCameraViewChange = useCallback(
    (state: GlobeCameraViewState) => {
      // Globe may still mount during crossfade — ignore camera ticks unless 3D is active.
      if (mapMode !== "3d" || mapViewTransition !== "ready") {
        return;
      }

      globeCameraDistanceRef.current = state.distance;
      setGlobeCameraDistance((prev) => {
        if (Math.abs(prev - state.distance) < 0.06) return prev;
        return state.distance;
      });

      setGlobeViewCenter((prev) => {
        const dLat = Math.abs(prev.latitude - state.centerLat);
        const dLng = Math.abs(prev.longitude - state.centerLng);
        if (dLat < 0.25 && dLng < 0.25) return prev;
        return {
          latitude: state.centerLat,
          longitude: state.centerLng,
        };
      });

      if (globeRegionSettleTimerRef.current) {
        clearTimeout(globeRegionSettleTimerRef.current);
      }
      globeRegionSettleTimerRef.current = setTimeout(() => {
        globeRegionSettleTimerRef.current = null;
        applyRegionSettleFromViewport({
          mapCenter: {
            latitude: state.centerLat,
            longitude: state.centerLng,
          },
          globeDistance: state.distance,
          useGlobeDistance: true,
          settleEnabled: true,
        });
      }, REGION_SWITCH_HYSTERESIS_MS);
    },
    [applyRegionSettleFromViewport, mapMode, mapViewTransition],
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

      applyRegionSettleFromViewport({
        mapCenter: { latitude: region.latitude, longitude: region.longitude },
        latitudeDelta: region.latitudeDelta,
        settleEnabled: !is3d,
      });
    },
    [applyRegionSettleFromViewport, is3d],
  );

  const handleFlatTransitionComplete = useCallback(() => {
    const pendingFocusName = pendingFlatFocusNameRef.current;
    const pendingPresentationMode = pendingFlatPresentationModeRef.current;
    pendingFlatFocusNameRef.current = null;
    pendingFlatPresentationModeRef.current = null;

    setMapMode("2d");
    setMapViewTransition("idle");

    const restore = resolveFlatTransitionRestore({
      pendingFocusName,
      pendingPresentationMode,
      activeCountryName:
        useIdentityStore.getState().activeCountry?.name ?? null,
    });

    if (!restore || countries.length === 0) {
      return;
    }

    const pick = countries.find((c) => c.name === restore.focusName) ?? null;
    if (!pick) {
      return;
    }

    if (restore.restorePreview) {
      setPresentationMode("preview");
    }

    focusCountryOnFlatMap(pick, 650, restore.framing);
  }, [countries, focusCountryOnFlatMap, setMapMode, setPresentationMode]);

  const applyPendingExternalMapFocus = useCallback(() => {
    const intent = useMapStore.getState().pendingMapIntent;
    const mapState = useMapStore.getState();
    if (!intent || countries.length === 0) return;

    const pick = countries.find((c) => c.name === intent.countryName) ?? null;
    const useGlobeCamera =
      mapMode === "3d" && mapViewTransition !== "enteringFlat";

    const eligibility = resolveExternalMapFocusEligibility({
      intent,
      countriesFullyLoaded: mapState.mapCountriesFullyLoaded,
      countryFound: !!pick,
      alreadyAppliedCountryName: externalFocusAppliedRef.current,
      useGlobeCamera,
      flatMapReady: flatMapReadyRef.current,
      globeReady:
        mapViewTransition === "ready" && !!useMapStore.getState().globeCamera,
    });

    if (!eligibility.eligible) {
      if (eligibility.deferReason) {
      }
      return;
    }

    if (!pick) return;

    externalFocusAppliedRef.current = intent.countryName;

    setActiveChip("all");
    setFeaturedShortcut(null);

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
      const isSelected = activeCountry?.name === country.name;

      if (isSelected && isPreviewOpen) {
        return;
      }
      if (isSelected) {
        openCountryPreview();
        return;
      }
      focusCountryOnMap(country, "mapTap");
    },
    [activeCountry, focusCountryOnMap, isPreviewOpen, openCountryPreview],
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
    if (
      !isRandomPickGenerationCurrent(
        generation,
        randomPickGenerationRef.current,
      )
    )
      return;

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
    if (
      !isRandomPickGenerationCurrent(
        generation,
        randomPickGenerationRef.current,
      )
    )
      return;

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
    if (
      !isRandomPickGenerationCurrent(
        generation,
        randomPickGenerationRef.current,
      )
    )
      return;

    setActiveChip("all");
    setFeaturedShortcut("saved");
    focusCountryOnMap(pick, "shuffle");
  }, [countries, focusCountryOnMap, setActiveChip, setFeaturedShortcut]);

  const handleRandomCountry = useCallback(async () => {
    if (
      !shouldAcceptRandomFabTap({
        isMapAnimating: isMapAnimatingRef.current,
        nowMs: Date.now(),
        lastTapAtMs: lastRandomFabTapAtRef.current,
      })
    ) {
      return;
    }
    lastRandomFabTapAtRef.current = Date.now();

    if (!mapCountriesFullyLoaded) {
      await loadMapCountries();
    }

    const countriesSnapshot = useMapStore.getState().countries;
    if (countriesSnapshot.length === 0) {
      return;
    }

    const generation = ++randomPickGenerationRef.current;

    // The FAB always draws from the global pool at world zoom — never continent mode.
    const pool = await buildMapRandomPool({
      countries: countriesSnapshot,
      activeChip,
      featuredShortcut: null,
      focusedRegion: null,
      useWorldPool: true,
    });
    if (
      !isRandomPickGenerationCurrent(
        generation,
        randomPickGenerationRef.current,
      )
    ) {
      return;
    }

    const excludeName = activeCountry?.name ?? null;
    const pick = pickRandomMapCountry(pool, excludeName);
    if (!pick) {
      return;
    }

    const showHint = !hasSeenRandomCountryHint;
    focusCountryOnMap(pick, "fab");
    if (showHint) {
      setRandomCountryHint(pick);
      dismissRandomCountryHint();
    }
  }, [
    activeChip,
    activeCountry,
    dismissRandomCountryHint,
    focusCountryOnMap,
    hasSeenRandomCountryHint,
    loadMapCountries,
    mapCountriesFullyLoaded,
  ]);

  const handleNextCountry = useCallback(async () => {
    if (!activeCountry || countries.length === 0) return;

    if (
      !shouldAcceptRandomFabTap({
        isMapAnimating: isMapAnimatingRef.current,
        nowMs: Date.now(),
        lastTapAtMs: lastShuffleTapAtRef.current,
      })
    ) {
      return;
    }
    lastShuffleTapAtRef.current = Date.now();

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
      if (
        !isRandomPickGenerationCurrent(
          generation,
          shufflePickGenerationRef.current,
        )
      ) {
        return;
      }

      const pick =
        pickRandomMapCountry(pool, activeCountry.name) ??
        pickRandomMapCountry(countries, activeCountry.name);
      if (!pick) return;

      advanceToCountryPreview(pick);
    } catch (err) {
      isMapAnimatingRef.current = false;
      setIsMapAnimating(false);
    } finally {
      if (
        generation === shufflePickGenerationRef.current &&
        !isMapAnimatingRef.current
      ) {
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

  const flyToWorldView = useCallback(
    (options?: { preserveCamera?: boolean }) => {
      const preserveCamera = options?.preserveCamera ?? false;

      cancelIntent();
      suppressWorldResetRef.current = false;
      clearExplicitRegionLock();
      resetGlobalPulse();
      clearCountrySelection();

      if (preserveCamera) {
        return;
      }

      if (is3d) {
        cancelCameraFlight();
        mapRef.current?.resetWorldView();
      } else {
        flight.flyTo([{ region: WORLD_INITIAL_REGION, duration: 600 }]);
      }
    },
    [
      cancelCameraFlight,
      cancelIntent,
      clearCountrySelection,
      clearExplicitRegionLock,
      flight,
      globeCameraDistance,
      is3d,
      resetGlobalPulse,
    ],
  );

  const handleReset = useCallback(() => {
    flyToWorldView();
    setActiveChip("all");
  }, [flyToWorldView, setActiveChip]);

  const handleBackToWorld = useCallback(() => {
    flyToWorldView({ preserveCamera: true });
  }, [flyToWorldView]);

  const recenterOnFocusedContinent = useCallback(
    (cluster: MapCluster) => {
      commitContinentNavigation(cluster, {
        updateFocusedRegion: false,
        clearSelection: false,
        source: "recenter",
      });
    },
    [commitContinentNavigation],
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

      commitContinentNavigation(cluster, {
        clearSelection: false,
        duration,
        globeDistance: GLOBE_REGION_CAMERA_DISTANCE,
        source: "preview-exit",
      });
    },
    [clusters, commitContinentNavigation],
  );

  /** Close preview sheet, keep country selected, return to the map mode in use when preview opened. */
  const dismissCountryPreview = useCallback(() => {
    cancelIntent();
    const country = useIdentityStore.getState().activeCountry;
    const savedMode = mapModeAtPreviewOpenRef.current;
    mapModeAtPreviewOpenRef.current = null;

    dismissMapPreview();
    setPreviewDismissToContinent(false);
    clearFocusTransition();

    const currentMode = useMapStore.getState().mapMode;
    if (savedMode && savedMode !== currentMode) {
      handleMapModeToggle();
      return;
    }

    if (country) {
      flyMapToCountryFrame(country, "continent", 650);
    }
  }, [
    cancelIntent,
    clearFocusTransition,
    flyMapToCountryFrame,
    handleMapModeToggle,
  ]);

  /** Re-tap Map tab while country details are open → dismiss and restore 2D/3D mode. */
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      if (!isPreviewOpen) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      dismissCountryPreview();
    });
    return unsubscribe;
  }, [navigation, isPreviewOpen, dismissCountryPreview]);

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
        if (is3d) {
          logGlobeTap({
            source: "controller",
            stage: "action",
            outcome: "dismiss-preview",
            coordinate,
            focusedRegion,
            boundaryFocusRegion,
            cameraTier,
            globeDistance: globeCameraDistance,
          });
        }
        dismissCountryPreview();
        return;
      }

      if (!coordinate) {
        if (activeCountry) {
          if (is3d) {
            logGlobeTap({
              source: "controller",
              stage: "action",
              outcome: "clear-country-no-coordinate",
              focusedRegion,
              boundaryFocusRegion,
              cameraTier,
              globeDistance: globeCameraDistance,
            });
          }
          clearCountryFocus();
        }
        return;
      }

      const tappedCountry = is3d
        ? resolveGlobeSurfaceTapCountry(
            allBoundaryPolygons,
            countries,
            coordinate,
          )
        : resolveMapCountryAtCoordinate(
            allBoundaryPolygons,
            countries,
            coordinate,
          );

      const continentContext = focusedRegion ?? previewRegion;

      if (tappedCountry) {
        const selectInFocusedContinent =
          shouldSelectCountryInFocusedContinentFromMapTap({
            focusedRegion: continentContext,
            tappedCountry,
            cameraTier,
          });
        const selectAcrossFocusedContinent =
          shouldSelectCountryAcrossFocusedContinentFromMapTap({
            focusedRegion: continentContext,
            tappedCountry,
          });
        const delegateCountrySelection =
          selectInFocusedContinent ||
          shouldDelegateMapTapToCountrySelection({
            presentationMode,
            activeCountry,
            focusedRegion,
            tappedCountry,
          });
        const willFocusContinent = canFocusContinentFromMapTap(
          is3d,
          focusedRegion,
          cameraTier,
        );

        if (is3d) {
          logGlobeTap({
            source: "controller",
            stage: "routing",
            outcome: delegateCountrySelection
              ? "land-delegate-country"
              : selectAcrossFocusedContinent
                ? "land-cross-continent"
                : willFocusContinent
                  ? "land-focus-continent"
                  : "land-select-fallback",
            coordinate,
            country: tappedCountry.name,
            region: tappedCountry.region,
            focusedRegion,
            boundaryFocusRegion,
            cameraTier,
            globeDistance: globeCameraDistance,
            flags: {
              selectInFocusedContinent,
              selectAcrossFocusedContinent,
              delegateCountrySelection,
              willFocusContinent,
            },
          });
        }

        showTapRipple(coordinate);

        if (delegateCountrySelection) {
          handleBoundaryCountryPress(tappedCountry);
          return;
        }

        if (selectAcrossFocusedContinent) {
          if (is3d) {
            logGlobeTap({
              source: "controller",
              stage: "action",
              outcome: "focus-country-cross-continent",
              coordinate,
              country: tappedCountry.name,
              region: tappedCountry.region,
              focusedRegion,
              boundaryFocusRegion,
              cameraTier,
              globeDistance: globeCameraDistance,
            });
          }
          focusCountryOnMap(tappedCountry, "mapTap");
          return;
        }

        if (willFocusContinent) {
          const cluster =
            clusters.find((c) => c.region === tappedCountry.region) ?? null;
          if (cluster) {
            if (is3d) {
              logGlobeTap({
                source: "controller",
                stage: "action",
                outcome: "focus-continent-from-land",
                coordinate,
                country: tappedCountry.name,
                region: cluster.region,
                focusedRegion,
                boundaryFocusRegion,
                cameraTier,
                globeDistance: globeCameraDistance,
              });
            }
            requestContinentFocus(cluster);
          } else if (is3d) {
            logGlobeTap({
              source: "controller",
              stage: "skip",
              outcome: "focus-continent-no-cluster",
              coordinate,
              country: tappedCountry.name,
              region: tappedCountry.region,
              focusedRegion,
              boundaryFocusRegion,
              cameraTier,
              globeDistance: globeCameraDistance,
            });
          }
          return;
        }

        if (
          cameraTier !== "world" &&
          continentContext &&
          tappedCountry.region !== continentContext
        ) {
          return;
        }

        handleBoundaryCountryPress(tappedCountry);
        return;
      }

      // No boundary hit — ocean, rivers, empty map, etc.
      showTapRipple(coordinate);

      if (activeCountry) {
        if (is3d) {
          logGlobeTap({
            source: "controller",
            stage: "action",
            outcome: "clear-country-ocean-tap",
            coordinate,
            focusedRegion,
            boundaryFocusRegion,
            cameraTier,
            globeDistance: globeCameraDistance,
          });
        }
        clearCountryFocus();
        return;
      }

      const cluster = findClusterAtWorldCoordinate(
        allBoundaryPolygons,
        countries,
        clusters,
        coordinate,
      );
      const willFocusContinentFromOcean =
        canFocusContinentFromMapTap(is3d, focusedRegion, cameraTier) &&
        canRefocusContinentFromMapTap(
          focusedRegion,
          cluster?.region ?? null,
          cameraTier,
        ) &&
        !!cluster;

      if (is3d) {
        logGlobeTap({
          source: "controller",
          stage: "routing",
          outcome: willFocusContinentFromOcean
            ? "ocean-focus-continent"
            : "ocean-noop",
          coordinate,
          region: cluster?.region ?? null,
          focusedRegion,
          boundaryFocusRegion,
          cameraTier,
          globeDistance: globeCameraDistance,
          flags: {
            willFocusContinentFromOcean,
            hasCluster: !!cluster,
          },
        });
      }

      if (willFocusContinentFromOcean && cluster) {
        requestContinentFocus(cluster);
      }
    },
    [
      activeCountry,
      allBoundaryPolygons,
      boundaryFocusRegion,
      cameraTier,
      clearCountryFocus,
      clusters,
      countries,
      dismissCountryPreview,
      focusCountryOnMap,
      focusedRegion,
      globeCameraDistance,
      handleBoundaryCountryPress,
      is3d,
      presentationMode,
      previewRegion,
      requestContinentFocus,
      showTapRipple,
    ],
  );

  const regionChromeVisible = showRegionChrome(
    focusedRegion,
    presentationMode,
    activeCountry,
  );
  const countryFocusPillVisible = showCountryFocusPill(
    presentationMode,
    activeCountry,
  );
  const showFlagToggle = mapMarkerCountries.length > 0;
  const showOnboarding =
    !hasSeenMapOnboarding &&
    shouldShowMapOnboarding({
      is3d,
      cameraTier,
      status,
      countryCount: countries.length,
      hasActiveCountry: activeCountry !== null,
      hasFocusTransition: focusTransitionCountryName !== null,
    });

  return {
    status,
    error,
    loadMapCountries,
    countries,
    clusters,
    allBoundaryPolygons,
    pinCountries,
    mapMarkerCountries,
    mapMarkersForCanvas,
    selectedMapName,
    isPreviewOpen,
    is3d,
    mapMode,
    mapViewTransition,
    cameraTier,
    cameraZoomState,
    globeEntryCameraDistance,
    isMapAnimating,
    isPreviewShufflePending,
    activeCountry,
    activeChip,
    focusedRegion,
    continentOverlayRegion,
    boundaryFocusRegion,
    previewRegion,
    previewDismissToContinent,
    focusTransitionCountryName,
    tapRippleAt,
    tapRippleToken,
    randomCountryHint,
    setRandomCountryHint,
    countryMarkerMode,
    markerReveal,
    markerRefreshToken,
    showRegionChrome: regionChromeVisible,
    showCountryFocusPill: countryFocusPillVisible,
    shouldShowFeaturedChips: shouldShowFeaturedChipsInMapChrome(
      is3d,
      cameraTier,
      focusedRegion,
    ),
    showFlagToggle,
    showOnboarding,
    dismissMapOnboarding,
    handleGlobeTransitionComplete,
    handleFlatTransitionComplete,
    handleFlatMapReady,
    handleGlobeCameraViewChange,
    handleFlatRegionChange,
    handleRegionChangeComplete,
    handleMapModeToggle,
    handleCountryPress,
    handleBoundaryCountryPress,
    handleMapPress,
    handleRandomCountry,
    handleNextCountry,
    handleReset,
    handleBackToWorld,
    handleBackToContinent,
    handleAllPress,
    handleTerrainPress,
    handleSavedPress,
    dismissCountryPreview,
    exitCountryPreviewToContinent,
    clearCountryFocus,
    openCountryPreview,
    requestContinentFocus,
  };
}
