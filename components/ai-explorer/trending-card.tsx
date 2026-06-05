import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";

type TrendingCardProps = {
  title: string;
  imageUri?: string;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TrendingCard({ title, imageUri, onPress }: TrendingCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        animatedStyle,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={title}
        />
      ) : null}

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 148,
    height: 168,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
    justifyContent: "flex-end",
  },
  cardPressed: {
    borderColor: AI_EXPLORER_THEME.borderStrong,
  },
  titleWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AI_EXPLORER_THEME.divider,
    padding: 12,
  },
  title: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    lineHeight: 18,
    color: AI_EXPLORER_THEME.textPrimary,
    textShadowColor: "rgba(0, 0, 0, 0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
