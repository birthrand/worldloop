import { ExploreSwipeHeader } from "@/components/explore/explore-swipe-header";
import {
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ExploreErrorProps = {
  message: string | null;
  onRetry: () => void;
};

export function ExploreError({ message, onRetry }: ExploreErrorProps) {
  return (
    <View style={styles.screen}>
      <ExploreSwipeHeader />
      <View style={styles.body}>
        <Text style={styles.title}>Couldn&apos;t load the feed</Text>
        <Text style={styles.message}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_HEADER,
    color: "#FFFFFF",
    textAlign: "center",
  },
  message: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
  },
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
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
});
