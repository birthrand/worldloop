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

import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { logMapDebug } from "@/lib/map-debug";
import { cca2FromFlagUrl, getMapDisplayLatLng } from "@/lib/map-country";
import {
  type MapMarkerPresentation,
  MAP_FOCUS_TRANSITION_2D_MS,
  MAP_FOCUS_TRANSITION_SCALE_PEAK,
  MARKER_DEEMPHASIZED_OPACITY,
} from "@/lib/map-region-markers";
import type { CountryMarkerDisplayMode } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const FOCUS_HALF_MS = MAP_FOCUS_TRANSITION_2D_MS / 2;
const SNAPSHOT_SETTLE_MS = 500;
/** Fixed marker anchor box — label is positioned outside this so selection does not shift the pin. */
const MARKER_ANCHOR_SIZE = 48;
const PIN_SIZE = 36;

/** Survives marker re-snapshots so flags do not flash on every map action. */
const loadedFlagUris = new Set<string>();

function isFlagUriCached(uri: string | null): boolean {
  return !!uri && loadedFlagUris.has(uri);
}

const FlagImage = memo(function FlagImage({
  flagUri,
  style,
  loaded,
  onLoad,
}: {
  flagUri: string;
  style: object;
  loaded: boolean;
  onLoad: () => void;
}) {
  return (
    <Image
      source={{ uri: flagUri }}
      recyclingKey={flagUri}
      cachePolicy="memory-disk"
      style={[style, !loaded && styles.flagHidden]}
      contentFit="cover"
      onLoadEnd={onLoad}
      onError={(event) => {
        logMapDebug("marker", "flag image error", {
          flagUri,
          error: event?.error,
        });
      }}
    />
  );
});

type FlagPinBodyProps = {
  selected: boolean;
  focusTransitioning: boolean;
  presentation: MapMarkerPresentation;
  flagUri: string | null;
  flagLoaded: boolean;
  onFlagLoad: () => void;
  onLayout: () => void;
};

function FlagPinBody({
  selected,
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
  }, [focusTransitioning, pulse]);

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
            onLoad={onFlagLoad}
          />
        ) : (
          <Text style={styles.flagEmoji}>🏳️</Text>
        )}
      </Animated.View>
    </View>
  );
}

type MapCountryMarkerProps = {
  country: MapCountry;
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
  onPress: () => void;
};

export const MapCountryMarker = memo(function MapCountryMarker({
  country,
  selected,
  focusTransitioning = false,
  deemphasized = false,
  displayMode = "flag",
  presentation = "full",
  revealGeneration = 0,
  keepLive = false,
  suspendSnapshot = false,
  refreshToken = 0,
  onPress,
}: MapCountryMarkerProps) {
  const isEntering =
    presentation === "entering" && !selected && !focusTransitioning;
  const fadeOpacity = useSharedValue(0);
  const fadeScale = useSharedValue(0.85);
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
  }, [
    deemphasized,
    fadeOpacity,
    fadeScale,
    isEntering,
    revealGeneration,
    selected,
    focusTransitioning,
  ]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ scale: fadeScale.value }],
  }));
  const showFlag = displayMode === "flag";
  const [latitude, longitude] = getMapDisplayLatLng(country);
  const flagUri = resolveFlagCdnUrl(
    country.flag,
    cca2FromFlagUrl(country.flag),
  );

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
    if (!showFlag) return;

    const mustStayLive =
      keepLive ||
      suspendSnapshot ||
      selected ||
      focusTransitioning ||
      (!!flagUri && !flagLoaded);

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

  if (!showFlag) return null;

  const tracksChanges =
    keepLive ||
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
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[styles.markerAnchor, fadeStyle]}
      >
        <FlagPinBody
          selected={selected}
          focusTransitioning={focusTransitioning}
          presentation={presentation}
          flagUri={flagUri}
          flagLoaded={flagLoaded}
          onFlagLoad={handleFlagLoad}
          onLayout={handlePinLayout}
        />
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
    borderWidth: 3,
    borderColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    elevation: 8,
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
    width: PIN_SIZE - 6,
    height: PIN_SIZE - 6,
    borderRadius: (PIN_SIZE - 6) / 2,
  },
  flagHidden: {
    opacity: 0,
  },
  flagEmoji: {
    fontSize: 20,
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
