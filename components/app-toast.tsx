import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_TEXT_BODY,
} from "@/constants/explore-swipe-layout";
import { useToastStore } from "@/store/use-toast-store";

export function AppToast() {
  const insets = useSafeAreaInsets();
  const message = useToastStore((state) => state.message);

  if (!message) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View
        key={message}
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(160)}
        style={[styles.toast, { top: insets.top + 56 }]}
      >
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "88%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  text: {
    fontFamily: "Poppins-Medium",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
    textAlign: "center",
  },
});
