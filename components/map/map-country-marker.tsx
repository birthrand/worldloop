import { Image } from "expo-image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl, getMapDisplayLatLng } from "@/lib/map-country";
import type { MapMarkerPresentation } from "@/lib/map-region-markers";
import type { CountryMarkerDisplayMode } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

const PULSE_TIMING = { duration: 900 };
const SNAPSHOT_SETTLE_MS = 500;
/** Fixed marker anchor box — label is positioned outside this so selection does not shift the pin. */
const MARKER_ANCHOR_SIZE = 48;
const PIN_SIZE = 28;

type FlagPinBodyProps = {
  selected: boolean;
  presentation: MapMarkerPresentation;
  flagUri: string | null;
  flagLoaded: boolean;
  onFlagLoad: () => void;
  onLayout: () => void;
};

function FlagPinBody({
  selected,
  presentation,
  flagUri,
  flagLoaded,
  onFlagLoad,
  onLayout,
}: FlagPinBodyProps) {
  const isEntering = presentation === "entering" && !selected;
  const pinStyle = isEntering ? styles.pinEntering : styles.pin;
  const flagStyle = selected
    ? styles.flagSelected
    : isEntering
      ? styles.flagEntering
      : styles.flag;
  const wrapperStyle = isEntering ? styles.wrapperEntering : styles.wrapper;
  const flagContent = flagUri ? (
    <>
      {!flagLoaded ? <Text style={styles.flagEmoji}>🏳️</Text> : null}
      <Image
        source={{ uri: flagUri }}
        style={[flagStyle, !flagLoaded && styles.flagHidden]}
        contentFit="cover"
        onLoadEnd={onFlagLoad}
      />
    </>
  ) : (
    <Text style={styles.flagEmoji}>🏳️</Text>
  );

  if (!selected) {
    return (
      <View style={wrapperStyle} pointerEvents="box-none" onLayout={onLayout}>
        <View style={pinStyle}>{flagContent}</View>
      </View>
    );
  }

  return (
    <SelectedPulsingFlagPin flagContent={flagContent} onLayout={onLayout} />
  );
}

function SelectedPulsingFlagPin({
  flagContent,
  onLayout,
}: {
  flagContent: ReactNode;
  onLayout: () => void;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.1, PULSE_TIMING), withTiming(1, PULSE_TIMING)),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value * 1.2 }],
    opacity: 0.28 + (pulse.value - 1) * 2,
  }));

  return (
    <View style={styles.wrapper} pointerEvents="box-none" onLayout={onLayout}>
      <Animated.View
        style={[styles.pulseRing, ringStyle]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.pin, styles.pinSelected, pinStyle]}>
        {flagContent}
      </Animated.View>
    </View>
  );
}

type MapCountryMarkerProps = {
  country: MapCountry;
  selected: boolean;
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

export function MapCountryMarker({
  country,
  selected,
  displayMode = "flag",
  presentation = "full",
  revealGeneration = 0,
  keepLive = false,
  suspendSnapshot = false,
  refreshToken = 0,
  onPress,
}: MapCountryMarkerProps) {
  const isEntering = presentation === "entering" && !selected;
  const fadeOpacity = useSharedValue(0);
  const fadeScale = useSharedValue(0.85);

  useEffect(() => {
    fadeOpacity.value = 0;
    fadeScale.value = 0.85;
    fadeOpacity.value = withTiming(selected ? 1 : isEntering ? 0.58 : 1, {
      duration: 350,
    });
    fadeScale.value = withTiming(1, { duration: 350 });
  }, [
    country.name,
    fadeOpacity,
    fadeScale,
    isEntering,
    revealGeneration,
    selected,
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
  const [flagLoaded, setFlagLoaded] = useState(false);
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

  useEffect(() => {
    if (displayMode === "hidden") return;
    setFlagLoaded(false);
    requestLiveMarker();
  }, [displayMode, flagUri, requestLiveMarker, showFlag]);

  useEffect(() => {
    if (refreshToken === 0) return;
    requestLiveMarker();
  }, [refreshToken, requestLiveMarker]);

  useEffect(() => {
    if (!showFlag) return;

    const mustStayLive =
      keepLive || suspendSnapshot || selected || (!!flagUri && !flagLoaded);

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
    selected,
    showFlag,
    suspendSnapshot,
  ]);

  const handlePinLayout = useCallback(() => {
    setHasLaidOut(true);
  }, []);

  const handleFlagLoad = useCallback(() => {
    setFlagLoaded(true);
  }, []);

  useEffect(() => () => clearFreezeTimer(), [clearFreezeTimer]);

  if (!showFlag) return null;

  const tracksChanges =
    keepLive || tracksViewChanges || suspendSnapshot || selected;

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
          presentation={presentation}
          flagUri={flagUri}
          flagLoaded={flagLoaded}
          onFlagLoad={handleFlagLoad}
          onLayout={handlePinLayout}
        />
        {selected && !isEntering ? (
          <View style={styles.labelRow} pointerEvents="none">
            <Text style={styles.countryName} numberOfLines={1}>
              {country.name}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Marker>
  );
}

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
  pulseRing: {
    position: "absolute",
    width: MARKER_ANCHOR_SIZE,
    height: MARKER_ANCHOR_SIZE,
    borderRadius: MARKER_ANCHOR_SIZE / 2,
    backgroundColor: "#fbbf24",
    // borderWidth: 2,
    // borderColor: "#fbbf24",
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
    // borderColor: "#fbbf24",
    // borderWidth: 3,
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
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
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0,1)",
  },
  flagHidden: {
    opacity: 0,
  },
  flagEmoji: {
    fontSize: 20,
  },
  labelRow: {
    position: "absolute",
    top: MARKER_ANCHOR_SIZE + 4,
    left: -40,
    right: -40,
    alignItems: "center",
  },
  countryName: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
