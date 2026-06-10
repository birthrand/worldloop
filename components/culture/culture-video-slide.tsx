import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, View, type AppStateStatus } from "react-native";

import { CountryImage } from "@/components/explore/country-image";
import { videos as bundledVideos } from "@/constants/videos";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import type { CountryVideo } from "@/types/country";

type CultureVideoSlideProps = {
  video: CountryVideo;
  flag: string;
  iso2: string;
  posterUri?: string;
  isActive: boolean;
  width: number;
  height: number;
};

function resolveVideoSource(video: CountryVideo) {
  if (video.provider === "demo") {
    return bundledVideos.onboardingHero;
  }
  return video.url;
}

export function CultureVideoSlide({
  video,
  flag,
  iso2,
  posterUri,
  isActive,
  width,
  height,
}: CultureVideoSlideProps) {
  const isMuted = useCultureFeedStore((s) => s.isMuted);
  const [showPoster, setShowPoster] = useState(true);
  const [hasError, setHasError] = useState(false);
  const source = resolveVideoSource(video);

  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    if (isPlaying) {
      setShowPoster(false);
    }
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") {
      setHasError(true);
      setShowPoster(true);
    }
  });

  useEffect(() => {
    player.muted = isMuted;

    if (isActive) {
      player.play();
      return;
    }

    player.pause();
  }, [isActive, isMuted, player]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && isActive) {
        player.muted = isMuted;
        player.play();
        return;
      }
      if (nextState === "background" || nextState === "inactive") {
        player.pause();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [isActive, isMuted, player]);

  useEffect(() => {
    setShowPoster(true);
    setHasError(false);
  }, [video.url]);

  const shouldShowPoster = showPoster || hasError;

  return (
    <View style={[styles.shell, { width, height }]}>
      {shouldShowPoster ? (
        <View style={StyleSheet.absoluteFill}>
          <CountryImage
            uri={posterUri}
            flag={flag}
            iso2={iso2}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>
      ) : null}

      {!hasError ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: "#0b132b",
  },
});
