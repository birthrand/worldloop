import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CultureEmptyProps = {
  onRetry: () => void;
};

export function CultureEmpty({ onRetry }: CultureEmptyProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 48 }]}>
      <Text style={styles.title}>No culture clips yet</Text>
      <Text style={styles.message}>
        Countries with video clips will appear here. Make sure the backend video
        service is running, or browse photo stories on Explore.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading culture feed"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Explore tab"
        onPress={() => router.push("/(tabs)/explore")}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>Browse Explore</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.82)",
  },
});
