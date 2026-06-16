import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeDismissSheet } from "@/components/explore/swipe-dismiss-sheet";
import {
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
} from "@/constants/explore-swipe-layout";
import { formatLandmarkTypeDisplay } from "@/lib/format-country";
import { openCountryDetail } from "@/lib/open-country-detail";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import type { PlaceFeedItem } from "@/types/place-feed";

type SavedLandmarkCardMenuProps = {
  item: PlaceFeedItem;
  style?: StyleProp<ViewStyle>;
};

type MenuRowProps = {
  label: string;
  subtitle?: string;
  destructive?: boolean;
  onPress: () => void;
};

function MenuRow({
  label,
  subtitle,
  destructive = false,
  onPress,
}: MenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && styles.menuRowPressed,
      ]}
    >
      <View style={styles.menuTextGroup}>
        <Text
          style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function SavedLandmarkCardMenu({
  item,
  style,
}: SavedLandmarkCardMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const toggleSaved = useSavedLandmarksStore((s) => s.toggleSaved);
  const { landmark, country } = item;
  const typeLabel = formatLandmarkTypeDisplay(landmark.type);

  const closeMenu = () => setOpen(false);

  const handleRemove = () => {
    closeMenu();
    toggleSaved(item);
  };

  const handleOpenCountry = () => {
    closeMenu();
    openCountryDetail(country, { from: "saved" });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${landmark.name}`}
        accessibilityHint="Opens remove and view country options"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          style,
          pressed && styles.triggerPressed,
        ]}
      >
        <Ionicons
          name="ellipsis-vertical"
          size={18}
          color="rgba(255, 255, 255, 0.72)"
        />
      </Pressable>

      <SwipeDismissSheet
        visible={open}
        onClose={closeMenu}
        sheetStyle={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
        backdropAccessibilityLabel="Close menu"
        accessibilityLabel={`More actions for ${landmark.name}`}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {landmark.name}
          </Text>
          <Text style={styles.sheetSubtitle} numberOfLines={1}>
            {typeLabel} · {country.name}
          </Text>
        </View>

        <View style={styles.menuPanel}>
          <MenuRow
            label="Remove"
            subtitle="Remove from your saved landmarks"
            destructive
            onPress={handleRemove}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            label="View country"
            subtitle={`Open ${country.name} in detail`}
            onPress={handleOpenCountry}
          />
        </View>
      </SwipeDismissSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  triggerPressed: {
    opacity: 0.78,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    gap: 4,
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  sheetHeader: {
    marginBottom: 2,
    gap: 2,
  },
  sheetTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  sheetSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  menuPanel: {
    gap: 0,
    marginTop: 4,
  },
  menuRow: {
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 8,
  },
  menuRowPressed: {
    opacity: 0.78,
  },
  menuTextGroup: {
    gap: 2,
  },
  menuLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  menuLabelDestructive: {
    color: "#FF6B6B",
  },
  menuSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
});
