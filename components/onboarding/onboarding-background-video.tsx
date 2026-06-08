import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { videos } from "@/constants/videos";

type OnboardingBackgroundVideoProps = {
  visible?: boolean;
};

export function OnboardingBackgroundVideo({
  visible = true,
}: OnboardingBackgroundVideoProps) {
  const player = useVideoPlayer(videos.onboardingHero, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  useEffect(() => {
    if (visible) {
      player.play();
      return;
    }

    player.pause();
  }, [player, visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
