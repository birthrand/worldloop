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
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapRegionChrome } from "@/components/map/map-region-chrome";
import { MapSpotlightChrome } from "@/components/map/map-spotlight-chrome";
import { MapSearchRow } from "@/components/map/map-search-row";
import { RandomCountryFab } from "@/components/map/random-country-fab";
import { type MapZoomTier } from "@/components/map/world-map-view";
import {
  regionForClusterFocus,
  regionForMapCountry,
  WORLD_INITIAL_REGION,
} from "@/constants/map-regions";
import { adjacentContinent, CONTINENTS } from "@/constants/regions";
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
import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
  REGION_FOCUS_INITIAL_DELTA,
  resolveRegionMarkerCountries,
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
  const [isMapAnimating, setIsMapAnimating] = useState(false);
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
  /** Continent to center on the globe after 2D → 3D when no country is selected. */
  const pendingGlobeRegionFocusRef = useRef<string | null>(null);
  /** Country to focus on the 2D map after 3D → 2D crossfade completes. */
  const pendingFlatFocusNameRef = useRef<string | null>(null);

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
  const focusLatLngOnGlobe = useMapStore((s) => s.focusLatLngOnGlobe);
  const clearPendingExternalFocus = useMapStore(
    (s) => s.clearPendingExternalFocus,
  );
  const pendingExternalFocusName = useMapStore(
    (s) => s.pendingExternalFocusName,
  );
  const pendingExternalFocusMode = useMapStore(
    (s) => s.pendingExternalFocusMode,
  );
  const globeCamera = useMapStore((s) => s.globeCamera);

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

  const handleMapModeToggle = useCallback(() => {
    if (mapMode === "3d") {
      pendingFlatFocusNameRef.current =
        selectedCountry?.name ?? spotlightCountryName ?? null;
      pendingGlobeFocusNameRef.current = null;
      pendingGlobeRegionFocusRef.current = null;
      setMapMode("2d");
      setMapViewTransition("enteringFlat");
      return;
    }

    const countryFocus =
      selectedCountry?.name ?? spotlightCountryName ?? null;
    pendingGlobeFocusNameRef.current = countryFocus;
    pendingGlobeRegionFocusRef.current =
      countryFocus || !focusedRegion ? null : focusedRegion;

    setMapMode("3d");
    setMapViewTransition("enteringGlobe");
  }, [
    focusedRegion,
    mapMode,
    selectedCountry?.name,
    setMapMode,
    spotlightCountryName,
  ]);

  const handleGlobeTransitionComplete = useCallback(() => {
    setMapViewTransition("ready");
  }, []);
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  const clusters = useMemo(() => buildMapClusters(countries), [countries]);

  const navigableContinents = useMemo(
    () =>
      CONTINENTS.filter((region) => clusters.some((c) => c.region === region)),
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
        const pinName = spotlightCountryName ?? selectedCountry?.name ?? null;
        if (!pinName) return [];
        const pin = countries.find((c) => c.name === pinName) ?? null;
        return pin ? [pin] : [];
      }
      return [];
    }

    const base = countries.filter((c) => c.region === focusedRegion);
    const visible = filterMapCountriesByChip(base, activeChip);

    const isDetailZoom = is3d
      ? globeCameraDistance <= GLOBE_DETAIL_CAMERA_DISTANCE
      : zoomTier === "country" || hasRegionZoomStarted;

    return resolveRegionMarkerCountries(visible, isDetailZoom);
  }, [
    activeChip,
    countries,
    focusedRegion,
    globeCameraDistance,
    hasRegionZoomStarted,
    is3d,
    selectedCountry?.name,
    spotlightCountryName,
    zoomTier,
  ]);

  const isDetailZoom = is3d
    ? globeCameraDistance <= GLOBE_DETAIL_CAMERA_DISTANCE
    : zoomTier === "country" || hasRegionZoomStarted;

  const markerReveal = useMapMarkerReveal({
    candidateCountries: pinCountries,
    viewportCenter: is3d
      ? globeViewCenter
      : {
          latitude: lastMapRegion.latitude,
          longitude: lastMapRegion.longitude,
        },
    focusedRegion,
    isDetailZoom,
    enabled: !!focusedRegion && !spotlightCountryName,
    suspendReveal: isMapAnimating,
  });

  const mapMarkerCountries = useMemo(() => {
    const base = spotlightCountryName
      ? pinCountries.filter((c) => c.name === spotlightCountryName)
      : markerReveal.countriesToRender;
    return base;
  }, [markerReveal.countriesToRender, pinCountries, spotlightCountryName]);

  mapMarkerCountriesRef.current = mapMarkerCountries;

  const mapMarkersForCanvas =
    isMapAnimating && frozenMapMarkersRef.current
      ? frozenMapMarkersRef.current
      : mapMarkerCountries;

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

  const beginProgrammaticMapFlight = useCallback((duration: number) => {
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
    }, duration + 150);
  }, []);

  const animateMapToRegion = useCallback(
    (region: Region, duration = 500) => {
      beginProgrammaticMapFlight(duration);
      mapRef.current?.animateToRegion(region, duration);
    },
    [beginProgrammaticMapFlight],
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

  /** Globe camera updates zoom/detail only — continent exploration stays in UI store until explicit exit. */
  const handleGlobeCameraViewChange = useCallback(
    (state: GlobeCameraViewState) => {
      // Globe may still mount during crossfade — ignore camera ticks unless 3D is active.
      if (mapMode !== "3d" || mapViewTransition !== "ready") {
        return;
      }

      setGlobeCameraDistance(state.distance);
      setGlobeViewCenter({
        latitude: state.centerLat,
        longitude: state.centerLng,
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

      if (isMapAnimatingRef.current) {
        return;
      }

      const nextTier = computeZoomTier(region.latitudeDelta);

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

  const focusCountryOnFlatMap = useCallback(
    (pick: MapCountry, duration = 650) => {
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
      lockExplicitRegion,
      setDisplayMode,
      setFocusedRegion,
      setHasRegionZoomStarted,
    ],
  );

  const flyMapToCountry = useCallback(
    (pick: MapCountry, duration = 650) => {
      if (is3d) {
        // Slower globe pan for spotlight/random — avoids abrupt jumps.
        const globeDuration = Math.max(duration, 1100);
        focusCountryOnGlobe(pick.name, globeDuration);
        return;
      }

      focusCountryOnFlatMap(pick, duration);
    },
    [focusCountryOnFlatMap, focusCountryOnGlobe, is3d],
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

    const hadPreview =
      useMapStore.getState().selectedCountry?.name === focusName;
    if (hadPreview) {
      selectCountry(pick.name);
    }

    focusCountryOnFlatMap(pick, 650);
  }, [countries, focusCountryOnFlatMap, selectCountry, setMapMode]);

  const applyPendingExternalMapFocus = useCallback(() => {
    const { pendingExternalFocusName: pendingName, pendingExternalFocusMode } =
      useMapStore.getState();
    if (!pendingName || countries.length === 0) return;

    const pick = countries.find((c) => c.name === pendingName) ?? null;
    if (!pick) return;

    setIsMapAnimating(true);

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

  const focusCountry = useCallback(
    (country: MapCountry) => {
      if (spotlightCountryName) {
        if (country.name === spotlightCountryName) {
          selectCountry(country.name);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
        spotlightOnMap(country);
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
      focusGlobeCountry,
      is3d,
      selectCountry,
      spotlightCountryName,
      spotlightOnMap,
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

    setActiveChip("all");
    setFeaturedShortcut("forYou");
    spotlightOnMap(pick);
  }, [countries, setActiveChip, setFeaturedShortcut, spotlightOnMap]);

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
    spotlightOnMap(pick);
  }, [countries, setActiveChip, setFeaturedShortcut, spotlightOnMap]);

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

  const recenterOnFocusedContinent = useCallback(
    (cluster: MapCluster) => {
      const flightDuration = 650;

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

  const recenterOnSpotlightCountry = useCallback(() => {
    if (!spotlightCountryName || countries.length === 0) return;

    const pick =
      countries.find((c) => c.name === spotlightCountryName) ?? null;
    if (!pick) return;

    flyMapToCountry(pick, 650);
  }, [countries, flyMapToCountry, spotlightCountryName]);

  const handleBackToContinentFromSpotlight = useCallback(() => {
    if (!focusedRegion) return;

    setSpotlightCountry(null);
    selectCountry(null);
    handleBackToContinent();
  }, [
    focusedRegion,
    handleBackToContinent,
    selectCountry,
    setSpotlightCountry,
  ]);

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
    const countryName = useMapStore.getState().selectedCountry?.name ?? null;
    selectCountry(null);
    // 3D / world-level 2D only show a pin while spotlight or preview is active.
    const focusedRegion = useMapUiStore.getState().focusedRegion;
    if (countryName && (is3d || !focusedRegion)) {
      setSpotlightCountry(countryName);
    }
  }, [is3d, selectCountry, setSpotlightCountry]);

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

      if (spotlightCountryName) {
        selectCountry(null);
        setSpotlightCountry(null);
        return;
      }

      // Continent exploration exits via Back to World only (2D and 3D).
      if (focusedRegion) {
        return;
      }
    },
    [
      allBoundaryPolygons,
      clusters,
      countries,
      dismissPreview,
      focusedRegion,
      handleClusterPress,
      is3d,
      selectedCountry,
      spotlightCountryName,
      selectCountry,
      setSpotlightCountry,
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

  const showSpotlightChrome = !isPreviewOpen && !!spotlightCountryName;
  const showRegionChrome =
    !isPreviewOpen && !!focusedRegion && !spotlightCountryName;
  const showMapChrome = showSpotlightChrome || showRegionChrome;
  const showFlagToggle = mapMarkerCountries.length > 0;

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const mapChromeClearance =
    showSpotlightChrome && focusedRegion ? 132 : showMapChrome ? 100 : 88;
  const mapOverlayBottom = regionChromeBottom + mapChromeClearance;

  const spotlightCountry = useMemo(() => {
    if (!spotlightCountryName) return null;
    return countries.find((c) => c.name === spotlightCountryName) ?? null;
  }, [countries, spotlightCountryName]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <MapCanvas
        ref={mapRef}
        countries={mapMarkersForCanvas}
        boundaryCountries={countries}
        clusters={clusters}
        selectedName={highlightedCountryName}
        focusedRegion={focusedRegion}
        zoomTier={is3d ? "region" : zoomTier}
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

        {showSpotlightChrome && spotlightCountry ? (
          <MapSpotlightChrome
            countryName={spotlightCountry.name}
            focusedRegion={focusedRegion}
            bottom={regionChromeBottom}
            onCountryPress={recenterOnSpotlightCountry}
            onContinentPress={
              focusedRegion ? handleBackToContinentFromSpotlight : undefined
            }
            onWorldPress={handleBackToWorld}
          />
        ) : showRegionChrome && focusedRegion ? (
          <MapRegionChrome
            focusedRegion={focusedRegion}
            bottom={regionChromeBottom}
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
