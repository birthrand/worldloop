import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { PROFILE_BACK_BUTTON_RING } from "@/constants/profile-theme";

type ProfileBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Outer ring diameter. */
  size?: number;
  iconSize?: number;
  iconColor?: string;
};

export function ProfileBackButton({
  onPress,
  accessibilityLabel = "Go back",
  size = 36,
  iconSize = 22,
  iconColor = "#ffffff",
}: ProfileBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.hitArea, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={iconSize} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PROFILE_BACK_BUTTON_RING,
  },
  pressed: {
    opacity: 0.85,
  },
});
