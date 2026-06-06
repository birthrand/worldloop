import { Pressable, StyleSheet, Text } from "react-native";

type SavedBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function SavedBackButton({
  onPress,
  accessibilityLabel = "Back",
}: SavedBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text className="font-medium text-sm text-white">back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.82,
  },
});
