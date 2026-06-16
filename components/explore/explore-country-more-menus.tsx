import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeDismissSheet } from "@/components/explore/swipe-dismiss-sheet";

import {
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
} from "@/constants/explore-swipe-layout";
import { focusCountryOnMap } from "@/lib/open-country-on-map";
import {
  DEFAULT_FEED_SORT_FIELD,
  DEFAULT_FEED_SORT_ORDER,
  useCountryFeedStore,
  type FeedSortField,
  type FeedSortOrder,
} from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

type ExploreCountryMoreMenusProps = {
  country: Country | undefined;
  isMoreMenuOpen: boolean;
  onCloseMoreMenu: () => void;
};

function getOrderLabels(field: FeedSortField): { asc: string; desc: string } {
  if (field === "population") {
    return { asc: "Low → High", desc: "High → Low" };
  }
  return { asc: "A → Z", desc: "Z → A" };
}

function getSortSummary(
  field: FeedSortField,
  order: FeedSortOrder,
): string | null {
  if (order === "random") return null;
  const orderLabel = getOrderLabels(field)[order];
  const fieldLabel = field === "population" ? "Population" : "Name";
  return `${fieldLabel} · ${orderLabel}`;
}

export function getExploreHasCustomSort(
  sortField: FeedSortField | null | undefined,
  sortOrder: FeedSortOrder | null | undefined,
): boolean {
  const field = sortField ?? DEFAULT_FEED_SORT_FIELD;
  const order = sortOrder ?? DEFAULT_FEED_SORT_ORDER;
  return field !== DEFAULT_FEED_SORT_FIELD || order !== DEFAULT_FEED_SORT_ORDER;
}

type SortRadioOptionProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function SortRadioOption({
  label,
  selected,
  disabled = false,
  onPress,
}: SortRadioOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.radioRow,
        disabled && styles.radioRowDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View
        style={[
          styles.radioOuter,
          selected && !disabled && styles.radioOuterSelected,
          disabled && styles.radioOuterDisabled,
        ]}
      >
        {selected && !disabled ? <View style={styles.radioInner} /> : null}
      </View>
      <Text
        style={[
          styles.radioLabel,
          selected && !disabled && styles.radioLabelSelected,
          disabled && styles.radioLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SortCheckboxOptionProps = {
  label: string;
  checked: boolean;
  onPress: () => void;
};

function SortCheckboxOption({
  label,
  checked,
  onPress,
}: SortCheckboxOptionProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.radioRow,
        pressed && styles.optionPressed,
      ]}
    >
      <View
        style={[styles.checkboxOuter, checked && styles.checkboxOuterChecked]}
      >
        {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <Text style={[styles.radioLabel, checked && styles.radioLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type MoreMenuRowProps = {
  label: string;
  subtitle?: string;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
};

function MoreMenuRow({
  label,
  subtitle,
  disabled = false,
  active = false,
  onPress,
}: MoreMenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        disabled && styles.menuRowDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View style={styles.menuTextGroup}>
        <Text
          style={[
            styles.menuLabel,
            disabled && styles.menuLabelDisabled,
            active && !disabled && styles.menuLabelActive,
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!disabled ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(255, 255, 255, 0.35)"
        />
      ) : null}
    </Pressable>
  );
}

export function ExploreCountryMoreMenus({
  country,
  isMoreMenuOpen,
  onCloseMoreMenu,
}: ExploreCountryMoreMenusProps) {
  const insets = useSafeAreaInsets();
  const sortField = useCountryFeedStore((s) => s.sortField);
  const sortOrder = useCountryFeedStore((s) => s.sortOrder);
  const setSort = useCountryFeedStore((s) => s.setSort);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [draftRandom, setDraftRandom] = useState(false);
  const [draftField, setDraftField] = useState<FeedSortField>(
    sortField ?? DEFAULT_FEED_SORT_FIELD,
  );
  const [draftOrder, setDraftOrder] = useState<FeedSortOrder>(
    sortOrder ?? DEFAULT_FEED_SORT_ORDER,
  );

  const currentField = sortField ?? DEFAULT_FEED_SORT_FIELD;
  const currentOrder = sortOrder ?? DEFAULT_FEED_SORT_ORDER;
  const sortOptionsDisabled = draftRandom;
  const hasSortChanges =
    (currentOrder === "random") !== draftRandom ||
    (!draftRandom &&
      (draftField !== currentField || draftOrder !== currentOrder));
  const hasCustomSort = getExploreHasCustomSort(sortField, sortOrder);
  const orderLabels = getOrderLabels(draftField);
  const currentSortSummary = getSortSummary(currentField, currentOrder);
  const countryName = country?.name ?? "this country";

  const handleShare = async () => {
    if (!country) return;
    try {
      await Share.share({
        message: `Discover ${country.name} on WorldLoop!`,
      });
    } catch {
      Alert.alert("Share", "Unable to share right now.");
    }
  };

  const handleOpenSortModal = () => {
    const random = currentOrder === "random";
    setDraftField(currentField);
    setDraftRandom(random);
    setDraftOrder(random ? "asc" : currentOrder);
    onCloseMoreMenu();
    setIsSortModalOpen(true);
  };

  const handleCloseSortModal = () => {
    setIsSortModalOpen(false);
  };

  const handleApplySort = () => {
    setSort(draftField, draftRandom ? "random" : draftOrder);
    setIsSortModalOpen(false);
  };

  const handleShareFromMenu = () => {
    onCloseMoreMenu();
    void handleShare();
  };

  const handleViewOnMap = () => {
    if (!country) return;
    onCloseMoreMenu();
    focusCountryOnMap(country, "explore");
    router.push("/(tabs)/map");
  };

  return (
    <>
      <SwipeDismissSheet
        visible={isMoreMenuOpen && country != null}
        onClose={onCloseMoreMenu}
        sheetStyle={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
        backdropAccessibilityLabel="Close more actions"
        accessibilityLabel="More actions"
      >
        <View style={styles.handleWrap}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>More actions</Text>
        </View>

        <View style={styles.menuPanel}>
          <MoreMenuRow
            label="Share"
            subtitle={`Share ${countryName} with friends`}
            onPress={handleShareFromMenu}
          />
          <View style={styles.menuDivider} />
          <MoreMenuRow
            label="View on map"
            subtitle={`Locate ${countryName} on the world map`}
            onPress={handleViewOnMap}
          />
          <View style={styles.menuDivider} />
          <MoreMenuRow
            label="Sort feed"
            subtitle={currentSortSummary ?? "Shuffled order"}
            active={hasCustomSort}
            onPress={handleOpenSortModal}
          />
          <View style={styles.menuDivider} />
          <MoreMenuRow
            label="Listen"
            subtitle="Narration coming soon"
            disabled
            onPress={() => {}}
          />
        </View>
      </SwipeDismissSheet>

      <SwipeDismissSheet
        visible={isSortModalOpen}
        onClose={handleCloseSortModal}
        sheetStyle={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
        backdropAccessibilityLabel="Close sort options"
        accessibilityLabel="Sort feed"
      >
        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetTitleGroup}>
            <Text style={styles.sheetTitle}>Sort feed</Text>
            {currentSortSummary ? (
              <Text style={styles.sheetSubtitle}>{currentSortSummary}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close sort options"
            hitSlop={10}
            onPress={handleCloseSortModal}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.optionPressed,
            ]}
          >
            <Ionicons
              name="close"
              size={20}
              color="rgba(255, 255, 255, 0.45)"
            />
          </Pressable>
        </View>

        <View style={styles.tabPanel}>
          <Text style={styles.sectionLabel}>Shuffle</Text>
          <SortCheckboxOption
            label="Random order"
            checked={draftRandom}
            onPress={() => setDraftRandom((prev) => !prev)}
          />

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionLabel}>Sort by</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Sort by"
            style={styles.radioGroup}
          >
            <SortRadioOption
              label="Name"
              selected={draftField === "name"}
              disabled={sortOptionsDisabled}
              onPress={() => setDraftField("name")}
            />
            <SortRadioOption
              label="Population"
              selected={draftField === "population"}
              disabled={sortOptionsDisabled}
              onPress={() => setDraftField("population")}
            />
          </View>

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionLabel}>Order</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Order"
            style={styles.radioGroup}
          >
            <SortRadioOption
              label={orderLabels.asc}
              selected={draftOrder === "asc"}
              disabled={sortOptionsDisabled}
              onPress={() => setDraftOrder("asc")}
            />
            <SortRadioOption
              label={orderLabels.desc}
              selected={draftOrder === "desc"}
              disabled={sortOptionsDisabled}
              onPress={() => setDraftOrder("desc")}
            />
          </View>
        </View>

        <View style={styles.modalActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel sort changes"
            onPress={handleCloseSortModal}
            style={({ pressed }) => [
              styles.actionButton,
              styles.cancelButton,
              pressed && styles.optionPressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={!hasSortChanges}
            accessibilityRole="button"
            accessibilityLabel="Apply sort changes"
            accessibilityState={{ disabled: !hasSortChanges }}
            onPress={handleApplySort}
            style={({ pressed }) => [
              styles.actionButton,
              styles.applyButton,
              !hasSortChanges && styles.applyButtonDisabled,
              pressed && hasSortChanges && styles.optionPressed,
            ]}
          >
            <Text
              style={[
                styles.applyText,
                !hasSortChanges && styles.applyTextDisabled,
              ]}
            >
              Apply
            </Text>
          </Pressable>
        </View>
      </SwipeDismissSheet>
    </>
  );
}

const styles = StyleSheet.create({
  optionPressed: {
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
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  sheetTitleGroup: {
    flex: 1,
    gap: 1,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  sheetSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.55)",
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
    gap: 12,
    minHeight: 52,
    paddingVertical: 6,
  },
  menuRowDisabled: {
    opacity: 0.55,
  },
  menuTextGroup: {
    flex: 1,
    gap: 1,
  },
  menuLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuLabelActive: {
    color: "#fbbf24",
  },
  menuLabelDisabled: {
    color: "rgba(255, 255, 255, 0.55)",
  },
  menuSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.5)",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  tabPanel: {
    gap: 0,
  },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "left",
    alignSelf: "flex-start",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 6,
  },
  radioGroup: {
    gap: 0,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    paddingVertical: 0,
  },
  radioRowDisabled: {
    opacity: 0.4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#fbbf24",
  },
  radioOuterDisabled: {
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fbbf24",
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOuterChecked: {
    borderColor: "#fbbf24",
    backgroundColor: "#fbbf24",
  },
  checkboxMark: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: "Poppins-Bold",
    color: "#0b132b",
    marginTop: -1,
  },
  radioLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.72)",
  },
  radioLabelSelected: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
  },
  radioLabelDisabled: {
    color: "rgba(255, 255, 255, 0.35)",
  },
  modalActions: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  applyButton: {
    backgroundColor: "#fbbf24",
  },
  applyButtonDisabled: {
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  cancelText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  applyText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
  applyTextDisabled: {
    color: "rgba(255, 255, 255, 0.65)",
  },
});
