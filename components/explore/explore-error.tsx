import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ExploreErrorProps = {
  message: string | null;
  onRetry: () => void;
};

export function ExploreError({ message, onRetry }: ExploreErrorProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-midnight-navy gap-4 px-8"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-center font-semibold text-lg text-white">
        Couldn&apos;t load the feed
      </Text>
      <Text className="text-center text-sm text-white/70">
        {message ?? "Check that the backend is running and try again."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading feed"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  retry: {
    marginTop: 8,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
});
