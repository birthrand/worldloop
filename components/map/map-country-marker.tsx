import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { travelMapCountryPinColor } from "@/components/travel-map/travel-map-legend";
import { MAP_COUNTRY_VISITED_RING_COLOR } from "@/constants/map-country-focus";
import type { TravelMapCountryPinCategory } from "@/constants/travel-map-legend";
import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl, getMapDisplayLatLng } from "@/lib/map-country";
import {
  type MapMarkerPresentation,
  MAP_FOCUS_TRANSITION_2D_MS,
  MAP_FOCUS_TRANSITION_SCALE_PEAK,
  MARKER_DEEMPHASIZED_OPACITY,
} from "@/lib/map-region-markers";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import type { CountryMarkerDisplayMode } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const FOCUS_HALF_MS = MAP_FOCUS_TRANSITION_2D_MS / 2;
const SNAPSHOT_SETTLE_MS = 500;
/** Fixed marker anchor box — label is positioned outside this so selection does not shift the pin. */
const MARKER_ANCHOR_SIZE = 48;
const PIN_SIZE = 36;
const SELECTED_PIN_SIZE = 30;
const CIRCLE_DOT_SIZE = 10;
const CIRCLE_DOT_SELECTED_SIZE = 14;
const CIRCLE_DOT_ENTERING_SIZE = 8;

/** Survives marker re-snapshots so flags do not flash on every map action. */
const loadedFlagUris = new Set<string>();

function isFlagUriCached(uri: string | null): boolean {
  return !!uri && loadedFlagUris.has(uri);
}

const FlagImage = memo(function FlagImage({
  flagUri,
  style,
  loaded,
  keepVisibleWhileLoading,
  onLoad,
}: {
  flagUri: string;
  style: object;
  loaded: boolean;
  /** Focal pin — avoid opacity-0 snapshots while the CDN image loads. */
  keepVisibleWhileLoading?: boolean;
  onLoad: () => void;
}) {
  return (
    <Image
      source={{ uri: flagUri }}
      recyclingKey={flagUri}
      cachePolicy="memory-disk"
      style={[style, !loaded && !keepVisibleWhileLoading && styles.flagHidden]}
      contentFit="cover"
      onLoadEnd={onLoad}
    />
  );
});

type FlagPinBodyProps = {
  selected: boolean;
  visited: boolean;
  categoryRingColor?: string;
  focusTransitioning: boolean;
  presentation: MapMarkerPresentation;
  flagUri: string | null;
  flagLoaded: boolean;
  onFlagLoad: () => void;
  onLayout: () => void;
};

function FlagPinBody({
  selected,
  visited,
  categoryRingColor,
  focusTransitioning,
  presentation,
  flagUri,
  flagLoaded,
  onFlagLoad,
  onLayout,
}: FlagPinBodyProps) {
  const isEntering =
    presentation === "entering" && !selected && !focusTransitioning;
  const flagStyle = selected
    ? styles.flagSelected
    : isEntering
      ? styles.flagEntering
      : styles.flag;
  const wrapperStyle = isEntering ? styles.wrapperEntering : styles.wrapper;
  const pinShellStyle = selected
    ? [styles.pin, styles.pinSelected]
    : categoryRingColor
      ? [
          styles.pin,
          styles.pinCategoryRing,
          {
            borderColor: categoryRingColor,
            shadowColor: categoryRingColor,
          },
        ]
      : visited
        ? [styles.pin, styles.pinVisited]
        : isEntering
          ? styles.pinEntering
          : styles.pin;

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!focusTransitioning) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }

    pulse.value = withSequence(
      withTiming(MAP_FOCUS_TRANSITION_SCALE_PEAK, {
        duration: FOCUS_HALF_MS,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1, {
        duration: FOCUS_HALF_MS,
        easing: Easing.in(Easing.quad),
      }),
    );
    return () => cancelAnimation(pulse);
  }, [focusTransitioning]);

  const pinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusTransitioning ? pulse.value : 1 }],
  }));

  const showPlaceholder = !!flagUri && !flagLoaded && !isFlagUriCached(flagUri);

  return (
    <View style={wrapperStyle} pointerEvents="box-none" onLayout={onLayout}>
      <Animated.View style={[pinShellStyle, pinAnimatedStyle]}>
        {showPlaceholder ? <Text style={styles.flagEmoji}>🏳️</Text> : null}
        {flagUri ? (
          <FlagImage
            flagUri={flagUri}
            style={flagStyle}
            loaded={flagLoaded}
            keepVisibleWhileLoading={selected || focusTransitioning}
            onLoad={onFlagLoad}
          />
        ) : (
          <Text style={styles.flagEmoji}>🏳️</Text>
        )}
      </Animated.View>
    </View>
  );
}

type CirclePinBodyProps = {
  selected: boolean;
  visited: boolean;
  categoryRingColor?: string;
  focusTransitioning: boolean;
  presentation: MapMarkerPresentation;
  onLayout: () => void;
};

function CirclePinBody({
  selected,
  visited,
  categoryRingColor,
  focusTransitioning,
  presentation,
  onLayout,
}: CirclePinBodyProps) {
  const isEntering =
    presentation === "entering" && !selected && !focusTransitioning;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!focusTransitioning) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }

    pulse.value = withSequence(
      withTiming(MAP_FOCUS_TRANSITION_SCALE_PEAK, {
        duration: FOCUS_HALF_MS,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1, {
        duration: FOCUS_HALF_MS,
        easing: Easing.in(Easing.quad),
      }),
    );
    return () => cancelAnimation(pulse);
  }, [focusTransitioning, pulse]);

  const pinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusTransitioning ? pulse.value : 1 }],
  }));

  const dotStyle = selected
    ? styles.circleDotSelected
    : categoryRingColor
      ? [
          styles.circleDot,
          {
            backgroundColor: categoryRingColor,
          },
        ]
      : visited
        ? styles.circleDotVisited
        : isEntering
          ? styles.circleDotEntering
          : styles.circleDot;

  return (
    <View style={styles.wrapper} pointerEvents="box-none" onLayout={onLayout}>
      {categoryRingColor && !selected && !focusTransitioning ? (
        <View
          style={[
            styles.circleCategoryRing,
            { borderColor: categoryRingColor },
          ]}
          pointerEvents="none"
        />
      ) : null}
      {visited && !categoryRingColor && !selected && !focusTransitioning ? (
        <View style={styles.circleVisitedRing} pointerEvents="none" />
      ) : null}
      <Animated.View style={[dotStyle, pinAnimatedStyle]} />
    </View>
  );
}

type LocationPinBodyProps = {
  selected: boolean;
  color: string;
};

function LocationPinBody({ selected, color }: LocationPinBodyProps) {
  return (
    <View style={styles.locationPinWrap} pointerEvents="none">
      <Ionicons
        name="location"
        size={selected ? 38 : 34}
        color={selected ? "#fbbf24" : color}
      />
    </View>
  );
}

type MapCountryMarkerProps = {
  country: MapCountry;
  /** When set, overrides the default map display coordinate (e.g. 2D nearby spread). */
  coordinate?: { latitude: number; longitude: number };
  selected: boolean;
  focusTransitioning?: boolean;
  deemphasized?: boolean;
  displayMode?: CountryMarkerDisplayMode;
  presentation?: MapMarkerPresentation;
  revealGeneration?: number;
  /** Single-pin spotlight — keep the marker bitmap live (reliable on Android). */
  keepLive?: boolean;
  /** While the map camera animates, keep re-rendering the marker view. */
  suspendSnapshot?: boolean;
  /** Bumped when the map camera settles so markers re-snapshot. */
  refreshToken?: number;
  travelCategory?: TravelMapCountryPinCategory;
  onPress: () => void;
};

export const MapCountryMarker = memo(function MapCountryMarker({
  country,
  coordinate: coordinateOverride,
  selected,
  focusTransitioning = false,
  deemphasized = false,
  displayMode = "flag",
  presentation = "full",
  revealGeneration = 0,
  keepLive = false,
  suspendSnapshot = false,
  refreshToken = 0,
  travelCategory,
  onPress,
}: MapCountryMarkerProps) {
  const isEntering =
    presentation === "entering" && !selected && !focusTransitioning;
  const fadeOpacity = useSharedValue(0);
  const fadeScale = useSharedValue(1);
  const prevRevealGenerationRef = useRef(revealGeneration);

  useEffect(() => {
    const targetOpacity = selected
      ? 1
      : deemphasized
        ? MARKER_DEEMPHASIZED_OPACITY
        : isEntering
          ? 0.58
          : 1;

    const didReveal = prevRevealGenerationRef.current !== revealGeneration;
    prevRevealGenerationRef.current = revealGeneration;

    // The focal pin must never play the reveal-in animation. A region swap bumps
    // revealGeneration to re-animate the new region's pins, but the selected /
    // focusing pin stays mounted — letting it reset to 0 makes its flag blink out.
    if (didReveal && !selected && !focusTransitioning) {
      fadeOpacity.value = 0;
      fadeScale.value = 0.85;
      fadeOpacity.value = withTiming(targetOpacity, { duration: 350 });
      fadeScale.value = withTiming(1, { duration: 350 });
      return;
    }

    fadeOpacity.value = withTiming(targetOpacity, { duration: 200 });
    fadeScale.value = withTiming(1, { duration: 200 });
  }, [
    deemphasized,
    isEntering,
    revealGeneration,
    selected,
    focusTransitioning,
  ]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ scale: fadeScale.value }],
  }));
  const [displayLat, displayLng] = getMapDisplayLatLng(country);
  const latitude = coordinateOverride?.latitude ?? displayLat;
  const longitude = coordinateOverride?.longitude ?? displayLng;
  const flagUri = resolveFlagCdnUrl(
    country.flag,
    cca2FromFlagUrl(country.flag),
  );
  const isVisited = useDiscoveryProgressStore((s) =>
    s.isCountryVisited({ name: country.name, cca2: "", flag: country.flag }),
  );
  const categoryRingColor = travelCategory
    ? travelMapCountryPinColor(travelCategory)
    : undefined;
  const useTravelLocationPin = !!travelCategory;
  const showVisitedBadge =
    !useTravelLocationPin &&
    !categoryRingColor &&
    isVisited &&
    !selected &&
    !focusTransitioning;
  const showFlag = displayMode === "flag" && !useTravelLocationPin;
  const showCircle = displayMode === "circle" && !useTravelLocationPin;
  const showMarker = showFlag || showCircle || useTravelLocationPin;
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [flagLoaded, setFlagLoaded] = useState(() => isFlagUriCached(flagUri));
  const [hasLaidOut, setHasLaidOut] = useState(false);
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFreezeTimer = useCallback(() => {
    if (freezeTimerRef.current) {
      clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = null;
    }
  }, []);

  const scheduleSnapshotFreeze = useCallback(() => {
    clearFreezeTimer();
    freezeTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
      freezeTimerRef.current = null;
    }, SNAPSHOT_SETTLE_MS);
  }, [clearFreezeTimer]);

  const requestLiveMarker = useCallback(() => {
    clearFreezeTimer();
    setTracksViewChanges(true);
    setHasLaidOut(false);
  }, [clearFreezeTimer]);

  const nudgeMarkerSnapshot = useCallback(() => {
    clearFreezeTimer();
    setTracksViewChanges(true);
    scheduleSnapshotFreeze();
  }, [clearFreezeTimer, scheduleSnapshotFreeze]);

  useEffect(() => {
    if (!showFlag) return;
    const cached = isFlagUriCached(flagUri);
    setFlagLoaded(cached);
    if (!cached) {
      requestLiveMarker();
    }
  }, [flagUri, requestLiveMarker, showFlag]);

  useEffect(() => {
    if (refreshToken === 0) return;
    if (!selected && !focusTransitioning && !keepLive) return;
    nudgeMarkerSnapshot();
  }, [
    focusTransitioning,
    keepLive,
    nudgeMarkerSnapshot,
    refreshToken,
    selected,
  ]);

  useEffect(() => {
    if (!showMarker) return;

    const mustStayLive =
      keepLive ||
      suspendSnapshot ||
      selected ||
      focusTransitioning ||
      (showFlag && !!flagUri && !flagLoaded);

    if (mustStayLive) {
      clearFreezeTimer();
      setTracksViewChanges(true);
      return;
    }

    if (!hasLaidOut) {
      setTracksViewChanges(true);
      return;
    }

    setTracksViewChanges(true);
    scheduleSnapshotFreeze();
    return clearFreezeTimer;
  }, [
    clearFreezeTimer,
    flagLoaded,
    flagUri,
    hasLaidOut,
    keepLive,
    scheduleSnapshotFreeze,
    focusTransitioning,
    selected,
    showFlag,
    showMarker,
    suspendSnapshot,
  ]);

  const handlePinLayout = useCallback(() => {
    setHasLaidOut(true);
  }, []);

  const handleFlagLoad = useCallback(() => {
    if (flagUri) {
      loadedFlagUris.add(flagUri);
    }
    setFlagLoaded(true);
  }, [flagUri]);

  useEffect(() => () => clearFreezeTimer(), [clearFreezeTimer]);

  if (!showMarker) return null;

  const tracksChanges = useTravelLocationPin
    ? false
    : keepLive ||
      tracksViewChanges ||
      suspendSnapshot ||
      selected ||
      focusTransitioning;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      tracksViewChanges={tracksChanges}
      anchor={useTravelLocationPin ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[
          useTravelLocationPin ? styles.locationPinAnchor : styles.markerAnchor,
          fadeStyle,
        ]}
      >
        {useTravelLocationPin ? (
          <LocationPinBody
            selected={selected}
            color={categoryRingColor ?? "#fbbf24"}
          />
        ) : showFlag ? (
          <FlagPinBody
            selected={selected}
            visited={showVisitedBadge}
            categoryRingColor={categoryRingColor}
            focusTransitioning={focusTransitioning}
            presentation={presentation}
            flagUri={flagUri}
            flagLoaded={flagLoaded}
            onFlagLoad={handleFlagLoad}
            onLayout={handlePinLayout}
          />
        ) : (
          <CirclePinBody
            selected={selected}
            visited={showVisitedBadge}
            categoryRingColor={categoryRingColor}
            focusTransitioning={focusTransitioning}
            presentation={presentation}
            onLayout={handlePinLayout}
          />
        )}
        {selected && !isEntering ? (
          <View style={styles.labelRow} pointerEvents="none">
            <View style={styles.labelPill}>
              <Text style={styles.countryName} numberOfLines={2}>
                {country.name}
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerAnchor: {
    width: MARKER_ANCHOR_SIZE,
    height: MARKER_ANCHOR_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  locationPinAnchor: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
  },
  locationPinWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: MARKER_ANCHOR_SIZE,
    height: MARKER_ANCHOR_SIZE,
  },
  wrapperEntering: {
    alignItems: "center",
    justifyContent: "center",
    width: MARKER_ANCHOR_SIZE,
    height: MARKER_ANCHOR_SIZE,
  },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    // borderWidth: 1.5,
    // borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "#1a1f2e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pinEntering: {
    width: 28,
    height: 28,
    borderRadius: 14,
    // borderWidth: 1.5,
    // borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#1a1f2e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pinSelected: {
    width: SELECTED_PIN_SIZE,
    height: SELECTED_PIN_SIZE,
    borderRadius: SELECTED_PIN_SIZE / 2,
    borderWidth: 2,
    borderColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 6,
  },
  pinVisited: {
    borderWidth: 2,
    borderColor: MAP_COUNTRY_VISITED_RING_COLOR,
    shadowColor: MAP_COUNTRY_VISITED_RING_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  pinCategoryRing: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  flag: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
  },
  flagEntering: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  flagSelected: {
    width: SELECTED_PIN_SIZE - 4,
    height: SELECTED_PIN_SIZE - 4,
    borderRadius: (SELECTED_PIN_SIZE - 4) / 2,
  },
  flagHidden: {
    opacity: 0,
  },
  flagEmoji: {
    fontSize: 20,
  },
  circleDot: {
    width: CIRCLE_DOT_SIZE,
    height: CIRCLE_DOT_SIZE,
    borderRadius: CIRCLE_DOT_SIZE / 2,
    backgroundColor: "#fbbf24",
  },
  circleDotEntering: {
    width: CIRCLE_DOT_ENTERING_SIZE,
    height: CIRCLE_DOT_ENTERING_SIZE,
    borderRadius: CIRCLE_DOT_ENTERING_SIZE / 2,
    backgroundColor: "#fbbf24",
  },
  circleDotSelected: {
    width: CIRCLE_DOT_SELECTED_SIZE,
    height: CIRCLE_DOT_SELECTED_SIZE,
    borderRadius: CIRCLE_DOT_SELECTED_SIZE / 2,
    backgroundColor: "#fbbf24",
    borderWidth: 2,
    borderColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 6,
  },
  circleDotVisited: {
    width: CIRCLE_DOT_SIZE,
    height: CIRCLE_DOT_SIZE,
    borderRadius: CIRCLE_DOT_SIZE / 2,
    backgroundColor: "#fbbf24",
    borderWidth: 2,
    borderColor: MAP_COUNTRY_VISITED_RING_COLOR,
  },
  circleVisitedRing: {
    position: "absolute",
    width: CIRCLE_DOT_SIZE + 8,
    height: CIRCLE_DOT_SIZE + 8,
    borderRadius: (CIRCLE_DOT_SIZE + 8) / 2,
    borderWidth: 2,
    borderColor: MAP_COUNTRY_VISITED_RING_COLOR,
    opacity: 0.55,
  },
  circleCategoryRing: {
    position: "absolute",
    width: CIRCLE_DOT_SIZE + 8,
    height: CIRCLE_DOT_SIZE + 8,
    borderRadius: (CIRCLE_DOT_SIZE + 8) / 2,
    borderWidth: 2,
    opacity: 0.72,
  },
  labelRow: {
    position: "absolute",
    alignSelf: "stretch",
    top: MARKER_ANCHOR_SIZE + 4,
    left: -56,
    right: -56,
    alignItems: "center",
  },
  labelPill: {
    maxWidth: 250,
    alignSelf: "stretch",
    paddingHorizontal: 8,
    // paddingVertical: 3,
    borderRadius: 12,
    // backgroundColor: "rgba(11, 19, 43, 0.5)",
    borderWidth: 0,
    borderColor: "rgba(251, 191, 36, 0.55)",
  },
  countryName: {
    fontSize: 14,
    alignSelf: "stretch",
    marginVertical: -8,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
});
