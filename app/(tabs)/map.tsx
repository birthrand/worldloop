import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { MapCountryFocusPill } from "@/components/map/map-country-focus-pill";
import { MapCountryPreviewCard } from "@/components/map/map-country-preview-card";
import { MapFeaturedChips } from "@/components/map/map-featured-chips";
import { MapFilterChips } from "@/components/map/map-filter-chips";
import { MapOnboardingSheet } from "@/components/map/map-onboarding-sheet";
import { MapRandomCountryHint } from "@/components/map/map-random-country-hint";
import { MapRegionChrome } from "@/components/map/map-region-chrome";
import { MapSearchRow } from "@/components/map/map-search-row";
import { MapTopChromeScrim } from "@/components/map/map-top-chrome-scrim";
import { continentDisplayLabel } from "@/constants/regions";
import { useMapLogic } from "@/hooks/use-map-logic";

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

/** Preview card "back to continent" action — off until UX is finalized. */
const PREVIEW_CONTINENT_BACK_ENABLED = false;

/** Keep chrome hidden until preview exit animation finishes (~spring settle). */
const PREVIEW_EXIT_MS = 320;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<MapCanvasHandle>(null);

  const map = useMapLogic(mapRef);
  const [previewExitHold, setPreviewExitHold] = useState(false);
  const wasPreviewOpenRef = useRef(false);
  const previewOverlayActive = map.isPreviewOpen || previewExitHold;

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

  useLayoutEffect(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.setOptions({
      tabBarStyle: previewOverlayActive ? { display: "none" } : TAB_BAR_STYLE,
    });
  }, [previewOverlayActive, navigation]);

  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
    };
  }, [navigation]);

  const regionChromeBottom = Math.max(insets.bottom, 16);
  const countryFocusPillBottom = 34;
  const countryChromeHeight = 44;
  const countryChromeGap = 24;
  const mapFabClearance = map.showRegionChrome ? 68 : 56;
  const mapFabBottom = map.showCountryFocusPill
    ? countryFocusPillBottom + countryChromeHeight + countryChromeGap
    : regionChromeBottom + mapFabClearance;
  const randomHintBottom = mapFabBottom + 72;
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
        previewRegion={map.previewRegion}
        tapRippleAt={map.tapRippleAt}
        tapRippleToken={map.tapRippleToken}
        zoomTier={map.is3d ? "region" : map.cameraTier}
        countryMarkerMode={map.countryMarkerMode}
        markerPresentation={map.markerReveal.presentation}
        markerRevealGeneration={map.markerReveal.revealGeneration}
        mapViewTransition={map.mapViewTransition}
        onGlobeTransitionComplete={map.handleGlobeTransitionComplete}
        onFlatTransitionComplete={map.handleFlatTransitionComplete}
        onGlobeCameraViewChange={map.handleGlobeCameraViewChange}
        lockUserGestures={previewOverlayActive}
        suspendMarkerSnapshot={map.isMapAnimating}
        markerRefreshToken={map.markerRefreshToken}
        onCountryPress={map.handleCountryPress}
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
              {map.is3d || map.cameraTier === "world" || !map.focusedRegion ? (
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
              onPress={() => void map.loadMapCountries()}
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
              bottomInset={insets.bottom}
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
  },
  pressed: {
    opacity: 0.85,
  },
});
