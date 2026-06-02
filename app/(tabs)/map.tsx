import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { MapCanvas, type MapCanvasHandle } from "@/components/map/map-canvas";
import { MapControls } from "@/components/map/map-controls";
import { MapCountryFocusPill } from "@/components/map/map-country-focus-pill";
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapDiscoveryChrome } from "@/components/map/map-discovery-chrome";
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapRandomCountryHint } from "@/components/map/map-random-country-hint";
import { MapRegionChrome } from "@/components/map/map-region-chrome";
import { MapSearchRow } from "@/components/map/map-search-row";
import { MapTopChromeScrim } from "@/components/map/map-top-chrome-scrim";
import { continentDisplayLabel } from "@/constants/regions";
import { useMapLogic } from "@/hooks/use-map-logic";
import { resolveGlobeAutoRotateEnabled } from "@/lib/globe-rotation";
import { openExploreHere } from "@/lib/open-explore-here";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

/** Preview card "back to continent" action — off until UX is finalized. */
const PREVIEW_CONTINENT_BACK_ENABLED = false;

/** Keep chrome hidden until preview exit animation finishes (~spring settle). */
const PREVIEW_EXIT_MS = 320;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapCanvasHandle>(null);

  const map = useMapLogic(mapRef);
  const viewportCountryCount = useSpatialContextStore(
    (s) => s.viewportCountryCount,
  );
  const discoveryTier = useSpatialContextStore((s) => s.discoveryScope.tier);
  const [previewExitHold, setPreviewExitHold] = useState(false);
  const [discoveryChromeFromFocus, setDiscoveryChromeFromFocus] =
    useState(false);
  const [discoveryChromeFromRegion, setDiscoveryChromeFromRegion] =
    useState(false);
  const wasPreviewOpenRef = useRef(false);
  const previewOverlayActive = map.isPreviewOpen || previewExitHold;
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
    if (!map.showCountryFocusPill) {
      setDiscoveryChromeFromFocus(false);
    }
  }, [map.showCountryFocusPill]);

  useEffect(() => {
    if (!map.showRegionChrome) {
      setDiscoveryChromeFromRegion(false);
    }
  }, [map.showRegionChrome]);

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const countryFocusPillBottom = 34;
  const countryChromeHeight = 44;
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
  const discoveryChromeCount = discoveryChromeFromRegionActive
    ? regionCountryCount
    : viewportCountryCount;
  const discoveryChromeBottom = map.showRegionChrome
    ? regionChromeBottom + countryChromeHeight + 12
    : map.showCountryFocusPill
      ? countryFocusPillBottom + countryChromeHeight + 12
      : mapFabBottom + 12;
  const showDiscoveryChromeEligible =
    !previewOverlayActive &&
    discoveryChromeCount > 0 &&
    (discoveryChromeFromRegionActive ||
      discoveryChromeFromFocus ||
      (discoveryTier !== "world" &&
        (map.cameraTier !== "world" || !!map.focusedRegion)));
  const showDiscoveryChrome =
    showDiscoveryChromeEligible &&
    (!map.showRegionChrome || discoveryChromeFromRegion) &&
    (!map.showCountryFocusPill || discoveryChromeFromFocus);
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
        selectedName={map.activeCountry?.name ?? null}
        focusTransitionName={map.focusTransitionCountryName}
        focusedRegion={map.focusedRegion}
        boundaryFocusRegion={map.boundaryFocusRegion}
        continentOverlayRegion={map.continentOverlayRegion}
        previewRegion={map.previewRegion}
        tapRippleAt={map.tapRippleAt}
        tapRippleToken={map.tapRippleToken}
        zoomTier={map.cameraTier}
        countryMarkerMode={map.countryMarkerMode}
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
            style={styles.previewDim}
            pointerEvents="none"
          />
        ) : null}

        {!previewOverlayActive ? (
          <>
            <MapTopChromeScrim paddingTop={insets.top + 12} />
            <View
              pointerEvents="box-none"
              className="gap-1.5"
              style={{ paddingTop: insets.top + 12, zIndex: 1 }}
            >
              <MapSearchRow />
              {map.shouldShowFeaturedChips ? (
                <MapFeaturedChips
                  onAllPress={() => void map.handleAllPress()}
                  onTerrainPress={() => void map.handleTerrainPress()}
                  onSavedPress={() => void map.handleSavedPress()}
                />
              ) : (
                <MapFilterChips />
              )}
            </View>
          </>
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

        {map.isPreviewOpen && map.activeCountry ? (
          <View style={styles.previewWrap} pointerEvents="box-none">
            <MapCountryPreviewCard
              country={map.activeCountry}
              bottomInset={
                tabBarHeight || TAB_BAR_CONTENT_HEIGHT + insets.bottom
              }
              onDismiss={map.dismissCountryPreview}
              onBackToContinent={
                PREVIEW_CONTINENT_BACK_ENABLED &&
                map.previewDismissToContinent &&
                map.focusedRegion
                  ? map.exitCountryPreviewToContinent
                  : undefined
              }
              backToRegionLabel={
                PREVIEW_CONTINENT_BACK_ENABLED && map.focusedRegion
                  ? continentDisplayLabel(map.focusedRegion)
                  : undefined
              }
              onNextCountry={() => void map.handleNextCountry()}
              isNextCountryLoading={map.isPreviewShufflePending}
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
            onShowDiscovery={() =>
              setDiscoveryChromeFromFocus((visible) => !visible)
            }
            discoveryChromeVisible={discoveryChromeFromFocus}
            onDismiss={map.clearCountryFocus}
          />
        ) : null}

        {map.randomCountryHint ? (
          <MapRandomCountryHint
            country={map.randomCountryHint}
            bottom={randomHintBottom}
            onDismiss={() => map.setRandomCountryHint(null)}
          />
        ) : null}

        {!previewOverlayActive ? (
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
            onExplorePress={() => void openExploreHere()}
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
  previewDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.45)",
  },
  previewWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
});
