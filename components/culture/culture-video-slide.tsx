import { LinearGradient } from "expo-linear-gradient";
import { VideoView, type VideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  StyleSheet,
  View,
  type AppStateStatus,
} from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import {
  SKELETON_COLOR_HERO,
  useSkeletonPulse,
} from "@/components/explore/skeleton-bone";
import { EXPLORE_SWIPE_CARD_IMAGE_FALLBACK } from "@/constants/explore-swipe-layout";
import { videos as bundledVideos } from "@/constants/videos";
import {
  acquirePooledCultureVideoPlayer,
  cultureVideoSourceKey,
  releasePooledCultureVideoPlayer,
} from "@/lib/culture-video-player-pool";
import {
  captureFirstFrameFromPlayer,
  isFirstFrameReady,
  markFirstFrameReady,
  subscribeFirstFrame,
} from "@/lib/video-first-frame-registry";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import type { CountryVideo } from "@/types/country";

type CultureVideoSlideProps = {
  video: CountryVideo;
  isActive: boolean;
  width: number;
  height: number;
  flag?: string;
  iso2?: string;
};

const FLAG_LOAD_WIDTH = 88;
const FLAG_LOAD_HEIGHT = 58;
const SHIMMER_BAND_WIDTH = 56;
/** Keep flag shimmer until playback passes this mark — avoids black lead-in frames. */
const REVEAL_MIN_PLAYBACK_SECONDS = 1;

export function CultureVideoFlagShimmer({
  flag = "",
  iso2,
}: {
  flag?: string;
  iso2?: string;
}) {
  const pulse = useSkeletonPulse();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_BAND_WIDTH, FLAG_LOAD_WIDTH + SHIMMER_BAND_WIDTH],
  });

  return (
    <View style={styles.flagShimmerShell}>
      <Animated.View style={[styles.flagShimmerBackdrop, { opacity: pulse }]} />

      <View style={styles.flagShimmerCenter}>
        <View
          style={[
            styles.flagShimmerFrame,
            { width: FLAG_LOAD_WIDTH, height: FLAG_LOAD_HEIGHT },
          ]}
        >
          <FlagBadge
            flag={flag}
            iso2={iso2}
            width={FLAG_LOAD_WIDTH}
            height={FLAG_LOAD_HEIGHT}
          />

          <View style={styles.flagShimmerMask} pointerEvents="none">
            <Animated.View
              style={[
                styles.flagShimmerBand,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            >
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(255, 255, 255, 0.1)",
                  "rgba(255, 255, 255, 0.45)",
                  "rgba(255, 255, 255, 0.1)",
                  "transparent",
                ]}
                locations={[0, 0.35, 0.5, 0.65, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.flagShimmerGradient}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

/** @deprecated Use CultureVideoFlagShimmer */
export function CultureVideoLoadingSkeleton() {
  return <CultureVideoFlagShimmer />;
}

function resolveVideoSource(video: CountryVideo) {
  if (video.provider === "demo") {
    return bundledVideos.onboardingHero;
  }
  return video.url;
}

function safePlayerOp(
  player: VideoPlayer,
  run: (activePlayer: VideoPlayer) => void,
): void {
  try {
    run(player);
  } catch {
    // Native shared object was released before this scoped mount finished.
  }
}

export function CultureVideoSlide({
  video,
  isActive,
  width,
  height,
  flag = "",
  iso2,
}: CultureVideoSlideProps) {
  const isMuted = useCultureFeedStore((s) => s.isMuted);
  const source = resolveVideoSource(video);
  const sourceKey = cultureVideoSourceKey(source);

  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const playerRef = useRef<VideoPlayer | null>(null);
  const ownerRef = useRef<symbol | null>(null);
  const heldSourceKeyRef = useRef<string | null>(null);
  const prevSourceKeyRef = useRef(sourceKey);
  const revealQueuedRef = useRef(false);
  const hasRevealedOnceRef = useRef(false);
  const hasMountPaintRef = useRef(false);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const [videoRevealed, setVideoRevealed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const resetLoadingState = useCallback((force = false) => {
    if (!force && hasRevealedOnceRef.current) return;

    revealQueuedRef.current = false;
    hasRevealedOnceRef.current = false;
    hasMountPaintRef.current = false;
    setVideoRevealed(false);
  }, []);

  /** Reveal only after this mount observes a decoded frame via timeUpdate. */
  const tryRevealAfterMountPaint = useCallback(() => {
    if (revealQueuedRef.current) return;
    if (!hasMountPaintRef.current) return;

    const pooledPlayer = playerRef.current;
    if (!pooledPlayer) return;

    try {
      if (pooledPlayer.currentTime <= REVEAL_MIN_PLAYBACK_SECONDS) return;
    } catch {
      return;
    }

    markFirstFrameReady(sourceKey);
    revealQueuedRef.current = true;
    hasRevealedOnceRef.current = true;
    setVideoRevealed(true);
  }, [sourceKey]);

  // Mount lifecycle: one pooled player + listener owner per slide instance.
  useEffect(() => {
    resetLoadingState(true);

    const releaseHeldPlayer = () => {
      if (!ownerRef.current) return;

      releasePooledCultureVideoPlayer(ownerRef.current);
      playerRef.current = null;
      ownerRef.current = null;
      heldSourceKeyRef.current = null;
    };

    if (playerRef.current && heldSourceKeyRef.current !== sourceKey) {
      releaseHeldPlayer();
    }

    if (!playerRef.current) {
      const handle = acquirePooledCultureVideoPlayer(source);
      playerRef.current = handle.player;
      ownerRef.current = handle.owner;
      heldSourceKeyRef.current = sourceKey;
      setPlayer(handle.player);
    }

    const pooledPlayer = playerRef.current;
    if (!pooledPlayer) return;

    captureFirstFrameFromPlayer(pooledPlayer, sourceKey);

    const timeSubscription = pooledPlayer.addListener(
      "timeUpdate",
      ({ currentTime }) => {
        if (currentTime <= REVEAL_MIN_PLAYBACK_SECONDS) return;
        hasMountPaintRef.current = true;
        markFirstFrameReady(sourceKey);
        tryRevealAfterMountPaint();
      },
    );

    const statusSubscription = pooledPlayer.addListener(
      "statusChange",
      ({ status }) => {
        if (status === "error") {
          setHasError(true);
          resetLoadingState(true);
          return;
        }

        if (status === "readyToPlay") {
          captureFirstFrameFromPlayer(pooledPlayer, sourceKey);
        }

        if (
          isActiveRef.current &&
          status === "loading" &&
          !hasRevealedOnceRef.current
        ) {
          resetLoadingState();
        }
      },
    );

    return () => {
      try {
        timeSubscription.remove();
        statusSubscription.remove();
      } catch {
        // Player released before listener teardown.
      }

      if (!ownerRef.current) return;

      releasePooledCultureVideoPlayer(ownerRef.current);
      playerRef.current = null;
      ownerRef.current = null;
      heldSourceKeyRef.current = null;
      setPlayer(null);
    };
  }, [resetLoadingState, source, sourceKey, tryRevealAfterMountPaint]);

  useEffect(() => {
    if (!isActive) return;

    tryRevealAfterMountPaint();

    return subscribeFirstFrame((key) => {
      if (key === sourceKey) tryRevealAfterMountPaint();
    });
  }, [isActive, sourceKey, tryRevealAfterMountPaint]);

  useEffect(() => {
    if (!player) return;

    safePlayerOp(player, (activePlayer) => {
      activePlayer.muted = isMuted;

      if (isActive) {
        activePlayer.timeUpdateEventInterval = 0.25;
        activePlayer.play();
        return;
      }

      activePlayer.timeUpdateEventInterval = isFirstFrameReady(sourceKey)
        ? 0
        : 0.25;

      if (activePlayer.status === "idle" || activePlayer.status === "loading") {
        activePlayer.play();
      }
      activePlayer.pause();
    });
  }, [isActive, isMuted, player, sourceKey]);

  useEffect(() => {
    if (!player) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && isActive) {
        safePlayerOp(player, (activePlayer) => {
          activePlayer.muted = isMuted;
          activePlayer.timeUpdateEventInterval = 0.25;

          if (!hasRevealedOnceRef.current) {
            resetLoadingState();
          }

          activePlayer.play();
        });
        return;
      }

      if (nextState === "background" || nextState === "inactive") {
        safePlayerOp(player, (activePlayer) => {
          activePlayer.pause();
        });
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [
    isActive,
    isMuted,
    player,
    sourceKey,
    resetLoadingState,
    tryRevealAfterMountPaint,
  ]);

  useEffect(() => {
    setHasError(false);

    if (prevSourceKeyRef.current === sourceKey) return;

    prevSourceKeyRef.current = sourceKey;

    resetLoadingState(true);
  }, [video.url, sourceKey, resetLoadingState]);

  const isVideoVisible = videoRevealed && !hasError;
  const showFlagShimmer = !isVideoVisible && !hasError;

  return (
    <View style={[styles.shell, { width, height }]}>
      {!hasError && player ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.videoSurface,
            { opacity: isVideoVisible ? 1 : 0 },
          ]}
          pointerEvents="none"
        >
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </View>
      ) : null}

      {showFlagShimmer ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <CultureVideoFlagShimmer flag={flag} iso2={iso2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  videoSurface: {
    zIndex: 2,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    zIndex: 3,
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  flagShimmerShell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  flagShimmerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SKELETON_COLOR_HERO,
  },
  flagShimmerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  flagShimmerFrame: {
    overflow: "hidden",
    borderRadius: 8,
  },
  flagShimmerMask: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  flagShimmerBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SHIMMER_BAND_WIDTH,
  },
  flagShimmerGradient: {
    flex: 1,
  },
});
