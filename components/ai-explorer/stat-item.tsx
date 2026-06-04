import { StyleSheet, Text, View } from "react-native";

import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";

type StatItemProps = {
  label: string;
  value: string;
  align?: "center" | "start";
  compact?: boolean;
};

export function StatItem({
  label,
  value,
  align = "center",
  compact = false,
}: StatItemProps) {
  return (
    <View
      style={[
        styles.root,
        compact && styles.rootCompact,
        align === "start" && styles.rootStart,
      ]}
    >
      <Text
        style={[styles.value, compact && styles.valueCompact]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.label, compact && styles.labelCompact]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  rootCompact: {
    gap: 1,
    justifyContent: "center",
  },
  rootStart: {
    alignItems: "flex-start",
  },
  value: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: AI_EXPLORER_THEME.textPrimary,
  },
  valueCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  label: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: AI_EXPLORER_THEME.textFaint,
  },
  labelCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
});
