import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type AiFunFactCardProps = {
  fact: string;
};

const FADE_MS = 0;

export function AiFunFactCard({ fact }: AiFunFactCardProps) {
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
  );
}

const styles = StyleSheet.create({
  factText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
  },
});
