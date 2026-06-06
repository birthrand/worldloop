import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StatItem } from "@/components/ai-explorer/stat-item";

type ProfileSectionProps = {
  title: string;
  children: ReactNode;
};

export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <View className="gap-2">
      <Text className="font-medium text-[11px] leading-[14px] tracking-[0.6px] uppercase text-white/48">
        {title}
      </Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

type ProfileFactRowProps = {
  label: string;
  value: string;
  /** Full-width row (for stacked lists). Default is half-width for grids. */
  fullWidth?: boolean;
};

/** Geography / profile facts — matches explorer stat tiles (value above label). */
export function ProfileFactRow({
  label,
  value,
  fullWidth = false,
}: ProfileFactRowProps) {
  return (
    <View
      style={[
        styles.factCell,
        fullWidth ? styles.factCellFull : styles.factCellHalf,
      ]}
    >
      <StatItem tile align="start" fill={false} label={label} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  factCell: {
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  factCellHalf: {
    width: "48%",
    flexGrow: 0,
    flexShrink: 0,
  },
  factCellFull: {
    width: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
});
