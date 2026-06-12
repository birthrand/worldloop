import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { PROFILE_CARD_BG, PROFILE_ICON } from "@/constants/profile-theme";

type ProfileStatsBarProps = {
  countries: number;
  saved: number;
  photos: number;
};

export function ProfileStatsBar({
  countries,
  saved,
  photos,
}: ProfileStatsBarProps) {
  return (
    <View style={styles.card}>
      <StatColumn icon="globe-outline" value={countries} label="Countries" />
      <View style={styles.divider} />
      <StatColumn icon="bookmark-outline" value={saved} label="Saved" />
      <View style={styles.divider} />
      <StatColumn icon="camera-outline" value={photos} label="Photos" />
    </View>
  );
}

function StatColumn({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.column}>
      <Ionicons name={icon} size={20} color={PROFILE_ICON} />
      <Text className="mt-2 font-bold text-2xl text-white">{value}</Text>
      <Text className="text-xs text-white/55">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: PROFILE_CARD_BG,
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginHorizontal: 16,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 56,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
