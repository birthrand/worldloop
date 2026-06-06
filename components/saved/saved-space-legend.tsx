import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Text, View } from "react-native";

import { SAVED_LEGEND_COLORS } from "@/lib/saved-space-layout";

type LegendItem = {
  color: string;
  label: string;
};

const LEGEND_ITEMS: LegendItem[] = [
  { color: SAVED_LEGEND_COLORS.favorites, label: "Favorites" },
  { color: SAVED_LEGEND_COLORS.wantToVisit, label: "Want to Visit" },
  { color: SAVED_LEGEND_COLORS.recentlySaved, label: "Recently Saved" },
];

type SavedSpaceLegendProps = {
  variant?: "inline" | "floating";
};

export function SavedSpaceLegend({
  variant = "inline",
}: SavedSpaceLegendProps) {
  const content = (
    <View style={styles.root}>
      {LEGEND_ITEMS.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text className="text-[11px] text-white/75">{item.label}</Text>
        </View>
      ))}
    </View>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <View style={styles.floatingShell}>
      {Platform.OS === "web" ? (
        <View style={styles.floatingWebFallback} />
      ) : (
        <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.floatingTint} />
      <View style={styles.floatingContent}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  floatingShell: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingWebFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.78)",
  },
  floatingTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.35)",
  },
  floatingContent: {
    zIndex: 1,
  },
});
