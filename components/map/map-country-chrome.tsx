import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

type MapCountryChromeProps = {
  bottom: number;
  actionLabel?: string;
  accessibilityLabel?: string;
  onAction: () => void;
};

export function MapCountryChrome({
  bottom,
  actionLabel = "Back to Continent",
  accessibilityLabel,
  onAction,
}: MapCountryChromeProps) {
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.stack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? actionLabel}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAction();
          }}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-undo-outline" size={18} color="#ffffff" />
          <Text style={styles.backLabel}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 7,
  },
  stack: {
    minWidth: 200,
    borderRadius: 20,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
  },
  backLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    textAlign: "center",
  },
  pressed: {
    backgroundColor: "#29303C",
  },
});
