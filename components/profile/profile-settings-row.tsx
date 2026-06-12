import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  PROFILE_ICON,
  PROFILE_ICON_BOX_RADIUS,
  PROFILE_ICON_RING,
  PROFILE_NAV_SUBTITLE,
  PROFILE_SWITCH_TRACK_ON,
} from "@/constants/profile-theme";

type ProfileSettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
  variant?: "default" | "field";
};

export function ProfileSettingsRow({
  icon,
  label,
  subtitle,
  value,
  showChevron = true,
  showToggle = false,
  toggleValue = false,
  onToggle,
  onPress,
  isLast = false,
  variant = "default",
}: ProfileSettingsRowProps) {
  const isField = variant === "field";

  const content = (
    <>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={18} color={PROFILE_ICON} />
        </View>
        <View style={styles.textBlock}>
          <Text
            className={
              isField
                ? "text-[11px] font-medium uppercase tracking-[0.6px] text-white/45"
                : "font-medium text-[15px] text-white"
            }
          >
            {label}
          </Text>
          {isField && value ? (
            <Text
              className="mt-0.5 text-[15px] leading-5 text-white"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {value}
            </Text>
          ) : subtitle ? (
            <Text
              className="mt-0.5 text-[13px] leading-[18px]"
              style={{ color: PROFILE_NAV_SUBTITLE }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {!isField && value ? (
          <Text
            className="mr-1 max-w-[120px] text-[13px] text-white/55"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
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
            size={17}
            color="rgba(255,255,255,0.35)"
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 58,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
  rowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: PROFILE_ICON_BOX_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: PROFILE_ICON_RING,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
});
