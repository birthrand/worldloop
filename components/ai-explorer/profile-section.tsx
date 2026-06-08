import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";

type ProfileSectionProps = {
  title: string;
  children: ReactNode;
};

export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

type ProfileFactRowProps = {
  label: string;
  value: string;
  /** Full-width row (for stacked lists). Default is half-width for grids. */
  fullWidth?: boolean;
};

export function ProfileFactRow({
  label,
  value,
  fullWidth = false,
}: ProfileFactRowProps) {
  return (
    <View style={[styles.factRow, fullWidth && styles.factRowFull]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  title: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: AI_EXPLORER_THEME.textMuted,
  },
  content: {
    gap: 8,
  },
  factRow: {
    flex: 1,
    minWidth: "45%",
    gap: 2,
  },
  factRowFull: {
    minWidth: "100%",
    flex: undefined,
    width: "100%",
  },
  factLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 10,
    color: AI_EXPLORER_THEME.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  factValue: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: AI_EXPLORER_THEME.textPrimary,
  },
});
