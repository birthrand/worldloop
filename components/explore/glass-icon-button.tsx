import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type GlassIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  accessibilityLabel?: string;
};

export function GlassIconButton({
  icon,
  label,
  onPress,
  active = false,
  activeColor = "#fbbf24",
  accessibilityLabel,
}: GlassIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.hitArea, pressed && styles.pressed]}
    >
      <View style={styles.circle}>
        <Ionicons
          name={icon}
          size={24}
          color={active ? activeColor : "#ffffff"}
        />
      </View>
      <Text style={[styles.label, active && { color: activeColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
    gap: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  label: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
});
