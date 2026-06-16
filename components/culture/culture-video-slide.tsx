import { LinearGradient } from "expo-linear-gradient";
import { VideoView, type VideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/video-first-frame-registry";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import type { CountryVideo } from "@/types/country";

export type CultureVideoContentPosition = "center" | "top";

type CultureVideoSlideProps = {
  video: CountryVideo;
  isActive: boolean;
  width: number;
  height: number;
  flag?: string;
  iso2?: string;
  /** Cover crop anchor — `top` keeps the upper frame visible in short heroes. */
  contentPosition?: CultureVideoContentPosition;
};

function getTopFocusedCoverHeight(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): number {
  if (videoWidth <= 0 || videoHeight <= 0) return containerHeight;

  const widthScale = containerWidth / videoWidth;
  const heightScale = containerHeight / videoHeight;

  if (widthScale >= heightScale) {
    return containerHeight;
  }

  return videoHeight * widthScale;
}

const FLAG_LOAD_WIDTH = 88;
const FLAG_LOAD_HEIGHT = 58;
const SHIMMER_BAND_WIDTH = 56;
/** Keep flag shimmer until playback passes this mark — avoids black lead-in frames. */
const REVEAL_MIN_PLAYBACK_SECONDS = 1;
const SHIMMER_FADE_OUT_MS = 150;

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
  contentPosition = "center",
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
  const hasMountFrameRenderedRef = useRef(false);
  const hasPlaybackPastRevealRef = useRef(false);
  const shimmerOpacity = useRef(new Animated.Value(1)).current;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const [shimmerMounted, setShimmerMounted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const topFocusedCoverHeight = useMemo(() => {
    if (contentPosition !== "top" || !videoSize) return height;

    return getTopFocusedCoverHeight(
      width,
      height,
      videoSize.width,
      videoSize.height,
    );
  }, [contentPosition, height, videoSize, width]);

  const resetLoadingState = useCallback(
    (force = false) => {
      if (!force && hasRevealedOnceRef.current) return;

      revealQueuedRef.current = false;
      hasRevealedOnceRef.current = false;
      hasMountFrameRenderedRef.current = false;
      hasPlaybackPastRevealRef.current = false;
      shimmerOpacity.setValue(1);
      setShimmerMounted(true);
    },
    [shimmerOpacity],
  );

  /** Reveal only when this mount's VideoView painted, playback is live, and t > 1s. */
  const tryReveal = useCallback(() => {
    if (revealQueuedRef.current) return;
    if (!hasMountFrameRenderedRef.current) return;
    if (!hasPlaybackPastRevealRef.current) return;

    const pooledPlayer = playerRef.current;
    if (!pooledPlayer) return;

    try {
      if (!pooledPlayer.playing) return;
      if (pooledPlayer.currentTime <= REVEAL_MIN_PLAYBACK_SECONDS) return;
    } catch {
      return;
    }

    revealQueuedRef.current = true;
    hasRevealedOnceRef.current = true;
    markFirstFrameReady(sourceKey);

    Animated.timing(shimmerOpacity, {
      toValue: 0,
      duration: SHIMMER_FADE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShimmerMounted(false);
    });
  }, [shimmerOpacity, sourceKey]);

  const handleFirstFrameRender = useCallback(() => {
    hasMountFrameRenderedRef.current = true;
    tryReveal();
  }, [tryReveal]);

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
        hasPlaybackPastRevealRef.current = true;
        markFirstFrameReady(sourceKey);
        tryReveal();
      },
    );

    const playingSubscription = pooledPlayer.addListener(
      "playingChange",
      ({ isPlaying }) => {
        if (!isPlaying) return;
        tryReveal();
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
        playingSubscription.remove();
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
  }, [resetLoadingState, source, sourceKey, tryReveal]);

  useEffect(() => {
    if (!isActive) return;
    tryReveal();
  }, [isActive, tryReveal]);

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
  }, [isActive, isMuted, player, sourceKey, resetLoadingState]);

  useEffect(() => {
    setHasError(false);

    if (prevSourceKeyRef.current === sourceKey) return;

    prevSourceKeyRef.current = sourceKey;
    setVideoSize(null);

    resetLoadingState(true);
  }, [video.url, sourceKey, resetLoadingState]);

  useEffect(() => {
    if (!player) {
      setVideoSize(null);
      return;
    }

    const syncVideoSize = () => {
      safePlayerOp(player, (activePlayer) => {
        const size = activePlayer.videoTrack?.size;
        if (!size?.width || !size?.height) return;

        setVideoSize((prev) =>
          prev?.width === size.width && prev?.height === size.height
            ? prev
            : { width: size.width, height: size.height },
        );
      });
    };

    syncVideoSize();

    const statusSubscription = player.addListener("statusChange", () => {
      syncVideoSize();
    });

    return () => {
      try {
        statusSubscription.remove();
      } catch {
        // Player released before listener teardown.
      }
    };
  }, [player, sourceKey]);

  const showFlagShimmer = shimmerMounted && !hasError;
  const usesTopFocusedCover = contentPosition === "top";

  return (
    <View style={[styles.shell, { width, height }]}>
      {!hasError && player ? (
        <View
          style={[
            usesTopFocusedCover
              ? [styles.videoSurfaceTop, { height: topFocusedCoverHeight }]
              : [StyleSheet.absoluteFill, styles.videoSurface],
          ]}
          pointerEvents="none"
        >
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
            onFirstFrameRender={handleFirstFrameRender}
          />
        </View>
      ) : null}

      {showFlagShimmer ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.loadingOverlay,
            { opacity: shimmerOpacity },
          ]}
          pointerEvents="none"
        >
          <CultureVideoFlagShimmer flag={flag} iso2={iso2} />
        </Animated.View>
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
  videoSurfaceTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
