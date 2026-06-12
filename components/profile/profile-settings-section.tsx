import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PROFILE_CARD_BG,
  PROFILE_TEXT_SUBTITLE,
} from "@/constants/profile-theme";

type ProfileSettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function ProfileSettingsSection({
  title,
  children,
}: ProfileSettingsSectionProps) {
  return (
    <View style={styles.root}>
      <Text
        className="px-1 text-[11px] font-semibold uppercase tracking-[1.2px]"
        style={{ color: PROFILE_TEXT_SUBTITLE }}
      >
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  card: {
    borderRadius: 16,
    backgroundColor: PROFILE_CARD_BG,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
});
