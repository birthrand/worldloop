import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Divider } from "@/components/ai-explorer/divider";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { CATEGORY_CHIPS, type CategoryId } from "@/data/ai-explorer-content";

type CategoryTabsProps = {
  selected: CategoryId;
  onSelect: (id: CategoryId) => void;
};

type CategoryTabProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  onLayout: (x: number, width: number) => void;
};

function CategoryTab({ label, active, onPress, onLayout }: CategoryTabProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        onLayout(x, width);
      }}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      {active ? <View style={styles.indicator} /> : null}
    </Pressable>
  );
}

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  const tabListRef = useRef<ScrollView>(null);
  const tabOffsetsRef = useRef<Partial<Record<CategoryId, number>>>({});

  useEffect(() => {
    const x = tabOffsetsRef.current[selected];
    if (x === undefined) return;
    tabListRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [selected]);

  return (
    <View style={styles.bar}>
      <ScrollView
        ref={tabListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroll}
      >
        {CATEGORY_CHIPS.map((tab) => (
          <CategoryTab
            key={tab.id}
            label={tab.label}
            active={selected === tab.id}
            onPress={() => onSelect(tab.id)}
            onLayout={(x) => {
              tabOffsetsRef.current[tab.id] = x;
            }}
          />
        ))}
      </ScrollView>
      <Divider style={styles.baseline} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: -16,
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: 16,
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: "center",
    position: "relative",
  },
  tabPressed: {
    opacity: 0.75,
  },
  label: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: AI_EXPLORER_THEME.textMuted,
  },
  labelActive: {
    color: AI_EXPLORER_THEME.primary,
  },
  indicator: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: AI_EXPLORER_THEME.primary,
  },
  baseline: {
    marginHorizontal: 16,
  },
});
