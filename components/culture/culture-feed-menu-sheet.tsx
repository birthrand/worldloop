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
      className="min-h-12 flex-row items-center justify-between gap-3 py-1.5"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text
        className={`flex-1 text-[15px] leading-5 text-white ${selected ? "font-semibold" : "font-medium"}`}
        style={{ includeFontPadding: false }}
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
      void restoreForYouFeed();
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
          className="w-full gap-1 rounded-t-2xl border border-b-0 border-white/14 bg-gray-900 px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
          accessibilityViewIsModal
        >
          <View className="mb-0.5 flex-row items-center justify-between gap-2">
            <Text className="font-semibold text-base leading-5 text-white">
              Browse feed
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close feed filters"
              hitSlop={10}
              onPress={onClose}
              className="h-7 w-7 items-center justify-center"
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons
                name="close"
                size={20}
                color="rgba(255, 255, 255, 0.45)"
              />
            </Pressable>
          </View>

          <View className="mt-1 gap-0">
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
                  {index > 0 ? <View className="h-px bg-white/8" /> : null}
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
});
