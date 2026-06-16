import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas, type MapCanvasHandle } from "@/components/map/map-canvas";
import { MapControls } from "@/components/map/map-controls";
import { MapCountryFocusHeader } from "@/components/map/map-country-focus-header";
import {
  MAP_COUNTRY_FOCUS_PILL_HEIGHT,
  MapCountryFocusPill,
} from "@/components/map/map-country-focus-pill";
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapDiscoveryChrome } from "@/components/map/map-discovery-chrome";
import { MapLandmarkPreviewCard } from "@/components/map/map-landmark-preview-card";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapRandomCountryHint } from "@/components/map/map-random-country-hint";
import { MapRegionChrome } from "@/components/map/map-region-chrome";
import { MapSearchResultsPanel } from "@/components/map/map-search-results-panel";
import {
  getMapSearchPanelTop,
  MapTopChrome,
} from "@/components/map/map-top-chrome";
import { MapTopChromeScrim } from "@/components/map/map-top-chrome-scrim";
import { TravelMapLegend } from "@/components/travel-map/travel-map-legend";
import { WORLDLOOP_HEADER_TOP_PADDING } from "@/components/worldloop-header";
import {
  MAP_COUNTRY_PREVIEW_SCRIM_GRADIENT_COLORS,
  MAP_COUNTRY_PREVIEW_SCRIM_GRADIENT_LOCATIONS,
  MAP_LEGAL_ATTRIBUTION_CLEARANCE,
} from "@/constants/map-chrome-styles";
import { continentDisplayLabel } from "@/constants/regions";
import { useMapLogic } from "@/hooks/use-map-logic";
import { resolveGlobeAutoRotateEnabled } from "@/lib/globe-rotation";
import type { MapCluster } from "@/lib/map-clusters";
import { navigateBackFromMap } from "@/lib/navigate-back-from-map";
import { openExploreHere, openExploreRegion } from "@/lib/open-explore-here";
import { useIdentityStore } from "@/store/use-identity-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

/** Keep chrome hidden until preview exit animation finishes (~spring settle). */
const PREVIEW_EXIT_MS = 320;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  const map = useMapLogic(mapRef);
  const countryDetailReturnName = useIdentityStore(
    (s) => s.countryDetailReturnName,
  );
  const isMapSearchOpen = useSearchUiStore(
    (s) => s.isOpen && s.context === "map",
  );
  const viewportCountryCount = useSpatialContextStore(
    (s) => s.viewportCountryCount,
  );
  const discoveryTier = useSpatialContextStore((s) => s.discoveryScope.tier);
  const [previewExitHold, setPreviewExitHold] = useState(false);
  const [discoveryChromeFromRegion, setDiscoveryChromeFromRegion] =
    useState(false);
  const wasPreviewOpenRef = useRef(false);
  const previewOverlayActive =
    map.isPreviewOpen || previewExitHold || !!map.travelLandmarkPreviewPin;
  const globeAutoRotateEnabled = resolveGlobeAutoRotateEnabled({
    hasCountryFocus:
      !!map.activeCountry?.name || !!map.focusTransitionCountryName,
    hasContinentFocus: !!map.focusedRegion,
    hasContinentPreview: !!map.previewRegion,
  });

  useEffect(() => {
    if (map.isPreviewOpen) {
      wasPreviewOpenRef.current = true;
      setPreviewExitHold(false);
      return;
    }
    if (!wasPreviewOpenRef.current) return;
    wasPreviewOpenRef.current = false;
    setPreviewExitHold(true);
    const timer = setTimeout(() => setPreviewExitHold(false), PREVIEW_EXIT_MS);
    return () => clearTimeout(timer);
  }, [map.isPreviewOpen]);

  useEffect(() => {
    if (!map.showRegionChrome) {
      setDiscoveryChromeFromRegion(false);
    }
  }, [map.showRegionChrome]);

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const countryFocusPillBottom =
    Math.max(insets.bottom, 16) + MAP_LEGAL_ATTRIBUTION_CLEARANCE;
  const countryChromeHeight = MAP_COUNTRY_FOCUS_PILL_HEIGHT;
  const countryChromeGap = 24;
  const mapFabClearance = map.showRegionChrome ? 68 : 56;
  const mapFabBottom = map.showCountryFocusPill
    ? countryFocusPillBottom + countryChromeHeight + countryChromeGap
    : regionChromeBottom + mapFabClearance;
  const randomHintBottom = mapFabBottom + 72;
  const regionCountryCount = useMemo(() => {
    if (!map.focusedRegion) return 0;
    const fromCountries = map.countries.filter(
      (country) => country.region === map.focusedRegion,
    ).length;
    if (fromCountries > 0) return fromCountries;

    const cluster =
      map.clusters.find((entry) => entry.region === map.focusedRegion) ?? null;
    return cluster?.countryCount ?? 0;
  }, [map.clusters, map.countries, map.focusedRegion]);
  const discoveryChromeFromRegionActive =
    discoveryChromeFromRegion &&
    map.showRegionChrome &&
    !map.showCountryFocusPill;
  const discoveryChromeLabelMode = discoveryChromeFromRegionActive
    ? "region"
    : "viewport";
  const handleMenuContinentSelect = useCallback(
    (cluster: MapCluster) => {
      if (map.focusedRegion === cluster.region) {
        map.handleBackToContinent();
        return;
      }
      map.requestContinentFocus(cluster);
    },
    [map],
  );

  const discoveryChromeCount = discoveryChromeFromRegionActive
    ? regionCountryCount
    : viewportCountryCount;
  const hideTravelMapLegend = !!countryDetailReturnName && !!map.activeLandmark;
  const discoveryChromeBottom = map.showRegionChrome
    ? regionChromeBottom + countryChromeHeight + 12
    : map.showCountryFocusPill
      ? countryFocusPillBottom + countryChromeHeight + 12
      : mapFabBottom + 12;
  const showDiscoveryChromeEligible =
    !previewOverlayActive &&
    !hideTravelMapLegend &&
    discoveryChromeCount > 0 &&
    (discoveryChromeFromRegionActive ||
      (discoveryTier !== "world" &&
        (map.cameraTier !== "world" || !!map.focusedRegion)));
  const showDiscoveryChrome =
    showDiscoveryChromeEligible &&
    (!map.showRegionChrome || discoveryChromeFromRegion) &&
    !map.showCountryFocusPill;
  const showTravelMapHeader =
    map.isTravelMapSession && !isMapSearchOpen && !countryDetailReturnName;
  const showCountryFocusHeader =
    !showTravelMapHeader &&
    !!map.activeCountry &&
    !isMapSearchOpen &&
    (map.showCountryFocusPill ||
      map.isPreviewOpen ||
      (map.isTravelMapSession && countryDetailReturnName) ||
      hideTravelMapLegend);
  const countryFocusHeaderTitle = map.isExploreMapHandoff
    ? "Explore"
    : countryDetailReturnName && map.activeLandmark
      ? map.activeLandmark.name
      : (map.activeCountry?.name ?? "");
  const countryFocusHeaderBackLabel = map.isExploreMapHandoff
    ? "Back to Explore"
    : countryDetailReturnName
      ? "Back to country details"
      : "Go back";
  const onboardingBottom = Math.max(insets.bottom, 16) + 88;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <MapCanvas
        ref={mapRef}
        onFlatMapReady={map.handleFlatMapReady}
        countries={map.mapMarkersForCanvas}
        boundaryCountries={map.countries}
        clusters={map.clusters}
        selectedName={map.selectedMapName}
        focusTransitionName={map.focusTransitionCountryName}
        focusedRegion={map.focusedRegion}
        boundaryFocusRegion={map.boundaryFocusRegion}
        continentOverlayRegion={map.continentOverlayRegion}
        previewRegion={map.previewRegion}
        tapRippleAt={map.tapRippleAt}
        tapRippleToken={map.tapRippleToken}
        zoomTier={map.cameraTier}
        countryMarkerMode={map.countryMarkerMode}
        exploreMapHandoff={map.isExploreMapHandoff}
        flatSingleCountryFlag={map.flatSingleCountryFlagActive}
        travelMapSession={
          map.isTravelMapSession && !map.isCountryDetailLandmarkMapLock
        }
        travelCategoryByName={map.travelCategoryByCountryName}
        landmarkPin={map.activeLandmark}
        landmarkPins={map.travelLandmarkPins}
        onLandmarkPinPress={map.handleTravelLandmarkPinPress}
        markerPresentation={map.markerReveal.presentation}
        markerRevealGeneration={map.markerReveal.revealGeneration}
        mapViewTransition={map.mapViewTransition}
        onGlobeTransitionComplete={map.handleGlobeTransitionComplete}
        onFlatTransitionComplete={map.handleFlatTransitionComplete}
        onGlobeCameraViewChange={map.handleGlobeCameraViewChange}
        initialGlobeCameraDistance={map.globeEntryCameraDistance}
        lockUserGestures={previewOverlayActive || map.isMapAnimating}
        autoRotateEnabled={globeAutoRotateEnabled}
        suspendMarkerSnapshot={map.isMapAnimating}
        markerRefreshToken={map.markerRefreshToken}
        onCountryPress={map.handleCountryPress}
        onBoundaryCountryPress={map.handleBoundaryCountryPress}
        onClusterPress={map.requestContinentFocus}
        onMapPress={map.handleMapPress}
        onFlatRegionChange={map.handleFlatRegionChange}
        onRegionChangeComplete={map.handleRegionChangeComplete}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {map.isPreviewOpen ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            style={styles.previewScrimWrap}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[...MAP_COUNTRY_PREVIEW_SCRIM_GRADIENT_COLORS]}
              locations={[...MAP_COUNTRY_PREVIEW_SCRIM_GRADIENT_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

        {showTravelMapHeader ? (
          <MapCountryFocusHeader
            backOnly
            onBack={navigateBackFromMap}
            backAccessibilityLabel="Back to profile"
            dimmed={map.isPreviewOpen}
          />
        ) : showCountryFocusHeader ? (
          <MapCountryFocusHeader
            title={countryFocusHeaderTitle}
            backAccessibilityLabel={countryFocusHeaderBackLabel}
            backOnly={!!map.activeLandmark}
            onBack={navigateBackFromMap}
            dimmed={map.isPreviewOpen}
          />
        ) : !previewOverlayActive ? (
          <>
            <MapTopChromeScrim
              paddingTop={insets.top + WORLDLOOP_HEADER_TOP_PADDING}
              compact={isMapSearchOpen}
            />
            <View pointerEvents="box-none" style={{ zIndex: 1 }}>
              <MapTopChrome
                focusedRegion={map.focusedRegion}
                clusters={map.clusters}
                onSelectContinent={handleMenuContinentSelect}
                onSelectWorld={map.handleBackToWorld}
              />
            </View>

            {isMapSearchOpen ? (
              <MapSearchResultsPanel
                panelTop={getMapSearchPanelTop(insets.top)}
              />
            ) : null}
          </>
        ) : null}

        {map.isTravelMapSession &&
        !previewOverlayActive &&
        !hideTravelMapLegend ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.travelLegendWrap,
              { bottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <TravelMapLegend />
          </View>
        ) : null}

        {map.status === "loading" ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : null}

        {map.status === "error" ? (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#fbbf24" />
            <Text className="min-w-0 flex-1 body-sm text-white/85">
              {map.error ?? "Could not load map data"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading map"
              onPress={() => void map.loadMapCountries({ force: true })}
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

        {map.travelLandmarkPreviewPin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss landmark preview"
            onPress={map.dismissTravelLandmarkPreview}
            style={styles.previewScrimWrap}
          >
            <Animated.View
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(180)}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            >
              <LinearGradient
                colors={[...MAP_COUNTRY_PREVIEW_SCRIM_GRADIENT_COLORS]}
                locations={[...MAP_COUNTRY_PREVIEW_SCRIM_GRADIENT_LOCATIONS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Pressable>
        ) : null}

        {map.isPreviewOpen && map.activeCountry ? (
          <View style={styles.previewWrap} pointerEvents="box-none">
            <MapCountryPreviewCard
              country={map.activeCountry}
              bottomInset={insets.bottom}
              showViewCountryCta={
                map.isExploreMapHandoff || map.isTravelMapSession
              }
              viewCountryFrom={map.isTravelMapSession ? "profile" : "explore"}
              returnToMapAfterViewCountry={
                map.isExploreMapHandoff || map.isTravelMapSession
              }
              travelLegendCategories={
                map.isTravelMapSession
                  ? map.getTravelCountryCategories(map.activeCountry.name)
                  : []
              }
              onDismiss={map.dismissCountryPreview}
            />
          </View>
        ) : map.travelLandmarkPreviewPin ? (
          <View style={styles.previewWrap} pointerEvents="box-none">
            <MapLandmarkPreviewCard
              pin={map.travelLandmarkPreviewPin}
              bottomInset={insets.bottom}
              onDismiss={map.dismissTravelLandmarkPreview}
              compact={hideTravelMapLegend}
            />
          </View>
        ) : map.showOnboarding ? (
          <View style={[styles.previewWrap, { bottom: onboardingBottom }]}>
            <MapOnboardingSheet onDismiss={() => map.dismissMapOnboarding()} />
          </View>
        ) : null}

        {map.showRegionChrome && map.focusedRegion ? (
          <MapRegionChrome
            focusedRegion={map.focusedRegion}
            bottom={regionChromeBottom}
            onContinentPress={map.handleBackToContinent}
            onShowDiscovery={() =>
              setDiscoveryChromeFromRegion((visible) => !visible)
            }
            discoveryChromeVisible={discoveryChromeFromRegion}
            onWorldPress={map.handleBackToWorld}
          />
        ) : null}

        {map.showCountryFocusPill &&
        map.activeCountry &&
        !previewOverlayActive ? (
          <MapCountryFocusPill
            country={map.activeCountry}
            bottom={countryFocusPillBottom}
            onOpenDetails={map.openCountryPreview}
          />
        ) : null}

        {map.randomCountryHint && !isMapSearchOpen && !hideTravelMapLegend ? (
          <MapRandomCountryHint
            country={map.randomCountryHint}
            bottom={randomHintBottom}
            onDismiss={() => map.setRandomCountryHint(null)}
          />
        ) : null}

        {!previewOverlayActive &&
        !isMapSearchOpen &&
        !map.showCountryFocusPill &&
        !map.isTravelMapSession &&
        !hideTravelMapLegend ? (
          <MapControls
            mapMode={map.mapMode}
            mapViewTransition={map.mapViewTransition}
            boundaryPreviewZoomTier={map.cameraTier}
            onMapModeToggle={map.handleMapModeToggle}
            onReset={map.handleReset}
            onZoomIn={() => mapRef.current?.zoomBy("in")}
            onZoomOut={() => mapRef.current?.zoomBy("out")}
            showFlagToggle={map.showFlagToggle}
            showBoundaryControls
            bottom={mapFabBottom}
            keepCollapsed={map.showCountryFocusPill}
            onRandomCountryPress={() => void map.handleRandomCountry()}
            randomDeemphasized={map.showCountryFocusPill}
            randomDisabled={map.isMapAnimating}
          />
        ) : null}

        {showDiscoveryChrome ? (
          <MapDiscoveryChrome
            count={discoveryChromeCount}
            labelMode={discoveryChromeLabelMode}
            regionLabel={
              map.focusedRegion
                ? continentDisplayLabel(map.focusedRegion)
                : undefined
            }
            bottom={discoveryChromeBottom}
            onExplorePress={() => {
              if (discoveryChromeFromRegionActive && map.focusedRegion) {
                void openExploreRegion(map.focusedRegion);
                return;
              }
              void openExploreHere();
            }}
          />
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
  previewScrimWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  previewWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  travelLegendWrap: {
    position: "absolute",
    left: 16,
    zIndex: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
