import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Divider } from "@/components/ai-explorer/divider";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import type { InsightContent } from "@/data/ai-explorer-content";

type InsightCardProps = {
  insight: InsightContent;
  imageUri?: string;
  fullWidth?: boolean;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function InsightCard({
  insight,
  imageUri,
  fullWidth = false,
  onPress,
}: InsightCardProps) {
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
        fullWidth && styles.fullWidth,
        pressed && styles.cardPressed,
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.summary} numberOfLines={3}>
          {insight.summary}
        </Text>
      </View>

      <Divider />

      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={`${insight.title} preview`}
          />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 200,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
  },
  cardPressed: {
    borderColor: AI_EXPLORER_THEME.borderStrong,
  },
  fullWidth: {
    flex: undefined,
    width: "100%",
  },
  content: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    color: AI_EXPLORER_THEME.textPrimary,
  },
  summary: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 17,
    color: AI_EXPLORER_THEME.textSecondary,
  },
  imageWrap: {
    height: 88,
  },
});
