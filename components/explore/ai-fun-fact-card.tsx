import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

type AiFunFactCardProps = {
  fact: string;
  onPress?: () => void;
};

const FADE_MS = 0;

export function AiFunFactCard({ fact, onPress }: AiFunFactCardProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fact, opacity]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open AI country explorer"
      accessibilityHint="Opens a detailed AI-powered country profile"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && onPress ? styles.pressablePressed : null,
      ]}
    >
      <View className="max-w-[85%] self-start rounded-2xl bg-black/50 px-4 py-4">
        <Animated.View style={{ opacity }}>
          <View className="mb-1 flex-row items-center gap-2">
            <Ionicons name="sparkles" size={18} color="#fbbf24" />
            <Text className="font-semibold text-sm text-tab-active mt-1">
              AI Fun Fact
            </Text>
          </View>
          <Text style={styles.factText}>{fact}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "flex-start",
  },
  pressablePressed: {
    opacity: 0.88,
  },
  factText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
  },
});
