import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type SavedContentTab = "countries" | "landmarks";

type SavedTypeTabsProps = {
  activeTab: SavedContentTab;
  onTabChange: (tab: SavedContentTab) => void;
};

const TABS: Array<{ id: SavedContentTab; label: string }> = [
  { id: "countries", label: "Countries" },
  { id: "landmarks", label: "Landmarks" },
];

export function SavedTypeTabs({ activeTab, onTabChange }: SavedTypeTabsProps) {
  const handlePress = (tab: SavedContentTab) => {
    if (tab === activeTab) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  };

  return (
    <View style={styles.row}>
      {TABS.map(({ id, label }) => {
        const selected = activeTab === id;

        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Saved ${label.toLowerCase()}`}
            onPress={() => handlePress(id)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                selected ? styles.tabLabelSelected : styles.tabLabelIdle,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  tab: {
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabSelected: {
    borderBottomColor: "#FFFFFF",
  },
  tabPressed: {
    opacity: 0.82,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabLabelSelected: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
  },
  tabLabelIdle: {
    color: "rgba(255, 255, 255, 0.42)",
    fontFamily: "Poppins-Regular",
  },
});
