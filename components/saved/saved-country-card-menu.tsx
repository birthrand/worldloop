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
import { continentDisplayLabel, isContinent } from "@/constants/regions";
import { openDiscoverSimilarInExplore } from "@/lib/open-discover-similar-in-explore";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type SavedCountryCardMenuProps = {
  country: Country;
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

export function SavedCountryCardMenu({
  country,
  style,
}: SavedCountryCardMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);

  const region = country.region?.trim() ?? "";
  const regionLabel = continentDisplayLabel(region || "—");
  const similarSubtitle = isContinent(region)
    ? `Browse more countries in ${regionLabel}`
    : "Open this country in Explore";

  const closeMenu = () => setOpen(false);

  const handleRemove = () => {
    closeMenu();
    toggleSaved(country);
  };

  const handleDiscoverSimilar = () => {
    closeMenu();
    void openDiscoverSimilarInExplore(country);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${country.name}`}
        accessibilityHint="Opens remove and discover similar options"
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
        accessibilityLabel={`More actions for ${country.name}`}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {country.name}
          </Text>
        </View>

        <View style={styles.menuPanel}>
          <MenuRow
            label="Remove"
            subtitle="Remove from your saved list"
            destructive
            onPress={handleRemove}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            label="Discover similar"
            subtitle={similarSubtitle}
            onPress={handleDiscoverSimilar}
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
  },
  sheetTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
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
