import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WORLDLOOP_HEADER_ACCENT_COLOR } from "@/components/worldloop-header";
import {
  continentTabLabel,
  EXPLORE_HEADER_TABS,
  FOR_YOU_TAB,
  isContinent,
  type ExploreHeaderTab,
} from "@/constants/regions";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";

const SHEET_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

type CultureFeedMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type FeedMenuRowProps = {
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

function FeedMenuRow({
  label,
  selected,
  accessibilityLabel,
  onPress,
}: FeedMenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <Text
        style={[styles.menuLabel, selected && styles.menuLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? (
        <Ionicons
          name="checkmark"
          size={18}
          color={WORLDLOOP_HEADER_ACCENT_COLOR}
        />
      ) : null}
    </Pressable>
  );
}

export function CultureFeedMenuSheet({
  visible,
  onClose,
}: CultureFeedMenuSheetProps) {
  const insets = useSafeAreaInsets();
  const selectedRegion = useCultureFeedStore((s) => s.selectedRegion);
  const restoreForYouFeed = useCultureFeedStore((s) => s.restoreForYouFeed);
  const setRegionFilter = useCultureFeedStore((s) => s.setRegionFilter);

  const selectedTab: ExploreHeaderTab =
    selectedRegion === null
      ? FOR_YOU_TAB
      : (selectedRegion as ExploreHeaderTab);

  const onTabPress = (name: ExploreHeaderTab) => {
    if (name === FOR_YOU_TAB) {
      if (selectedRegion === null) {
        onClose();
        return;
      }
      void restoreForYouFeed();
      onClose();
      return;
    }

    if (!isContinent(name)) return;

    if (selectedRegion === name) {
      void setRegionFilter(null);
      onClose();
      return;
    }

    void setRegionFilter(name);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close feed filters"
          onPress={onClose}
        />
        <Animated.View
          entering={SHEET_ENTER}
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          accessibilityViewIsModal
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Browse feed</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close feed filters"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="close"
                size={20}
                color="rgba(255, 255, 255, 0.45)"
              />
            </Pressable>
          </View>

          <View style={styles.menuPanel}>
            {EXPLORE_HEADER_TABS.map((name, index) => {
              const selected = name === selectedTab;
              const accessibilityLabel =
                name === FOR_YOU_TAB
                  ? "Show your personalized culture feed"
                  : selected
                    ? `Clear ${name} filter and show For You feed`
                    : `Show culture clips from ${name}`;

              const label =
                name === FOR_YOU_TAB ? name : continentTabLabel(name, true);

              return (
                <View key={name}>
                  {index > 0 ? <View style={styles.menuDivider} /> : null}
                  <FeedMenuRow
                    label={label}
                    selected={selected}
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => onTabPress(name)}
                  />
                </View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255, 255, 255, 0.14)",
    gap: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuPanel: {
    gap: 0,
    marginTop: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
    paddingVertical: 6,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    includeFontPadding: false,
  },
  menuLabelSelected: {
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
