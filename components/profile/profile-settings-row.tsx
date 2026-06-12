import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  PROFILE_ICON,
  PROFILE_SWITCH_TRACK_ON,
} from "@/constants/profile-theme";

type ProfileSettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  showChevron?: boolean;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
};

export function ProfileSettingsRow({
  icon,
  label,
  value,
  showChevron = true,
  showToggle = false,
  toggleValue = false,
  onToggle,
  onPress,
  isLast = false,
}: ProfileSettingsRowProps) {
  const content = (
    <>
      <View style={styles.left}>
        <Ionicons name={icon} size={20} color={PROFILE_ICON} />
        <Text className="font-medium text-base text-white">{label}</Text>
      </View>

      <View style={styles.right}>
        {value ? (
          <Text className="mr-1 text-sm text-white/55">{value}</Text>
        ) : null}
        {showToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{
              false: "rgba(255,255,255,0.18)",
              true: PROFILE_SWITCH_TRACK_ON,
            }}
            thumbColor="#ffffff"
            ios_backgroundColor="rgba(255,255,255,0.18)"
          />
        ) : showChevron ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.45)"
          />
        ) : null}
      </View>
    </>
  );

  if (showToggle) {
    return (
      <View style={[styles.row, !isLast && styles.rowBorder]}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  rowPressed: {
    opacity: 0.88,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
