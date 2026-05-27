import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GlassIconButton } from "@/components/explore/glass-icon-button";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useMapStore } from "@/store/use-map-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type ExploreActionRailProps = {
  country: Country;
};

type SortField = "name" | "population";
type SortOrder = "asc" | "desc";

function getOrderLabels(field: SortField): { asc: string; desc: string } {
  if (field === "population") {
    return { asc: "Low → High", desc: "High → Low" };
  }
  return { asc: "A → Z", desc: "Z → A" };
}

type SortRadioOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function SortRadioOption({ label, selected, onPress }: SortRadioOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ExploreActionRail({ country }: ExploreActionRailProps) {
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));
  const sortField = useCountryFeedStore((s) => s.sortField);
  const sortOrder = useCountryFeedStore((s) => s.sortOrder);
  const setSort = useCountryFeedStore((s) => s.setSort);
  const saved = isSaved;
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [draftField, setDraftField] = useState<SortField>(sortField ?? "name");
  const [draftOrder, setDraftOrder] = useState<SortOrder>(sortOrder ?? "asc");
  const currentField = sortField ?? "name";
  const currentOrder = sortOrder ?? "asc";
  const hasSortChanges =
    draftField !== currentField || draftOrder !== currentOrder;
  const orderLabels = getOrderLabels(draftField);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Discover ${country.name} on WorldLoop!`,
      });
    } catch {
      Alert.alert("Share", "Unable to share right now.");
    }
  };

  const handleListen = () => {
    Alert.alert("Listen", "Narration coming in a later lesson.");
  };

  const handleOpenSortModal = () => {
    setDraftField(currentField);
    setDraftOrder(currentOrder);
    setIsSortModalOpen(true);
  };

  const handleApplySort = () => {
    setSort(draftField, draftOrder);
    setIsSortModalOpen(false);
  };

  const handleJumpToMap = async () => {
    try {
      await useMapStore.getState().loadMapCountries();
      useMapStore.getState().selectCountry(country.name);
      router.push("/(tabs)/map");
    } catch {
      Alert.alert("Map", "Unable to open map right now.");
    }
  };

  return (
    <>
      <View style={styles.rail} pointerEvents="box-none">
        <GlassIconButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          label="Save"
          active={saved}
          onPress={() => toggleSaved(country)}
          accessibilityLabel={
            saved ? `Unsave ${country.name}` : `Save ${country.name}`
          }
        />

        <GlassIconButton
          icon="share-social-outline"
          label="Share"
          onPress={() => {
            void handleShare();
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Listen — coming soon"
          accessibilityState={{ disabled: true }}
          onPress={handleListen}
          style={({ pressed }) => [styles.hitArea, pressed && styles.pressed]}
        >
          <View style={[styles.circle, styles.disabledCircle]}>
            <Ionicons name="volume-medium-outline" size={28} color="#94a3b8" />
          </View>
          <Text style={styles.disabledLabel}>Listen</Text>
        </Pressable>

        <GlassIconButton
          icon="globe-outline"
          label="Map"
          onPress={() => {
            void handleJumpToMap();
          }}
          accessibilityLabel={`Open ${country.name} on map`}
        />

        <GlassIconButton
          icon="swap-vertical-outline"
          label="Sort"
          onPress={handleOpenSortModal}
          accessibilityLabel="Sort displayed countries"
        />
      </View>

      <Modal
        visible={isSortModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsSortModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close sort modal"
            onPress={() => setIsSortModalOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.sectionLabel}>Sort by</Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Sort by"
              style={styles.radioGroup}
            >
              <SortRadioOption
                label="Name"
                selected={draftField === "name"}
                onPress={() => setDraftField("name")}
              />
              <SortRadioOption
                label="Population"
                selected={draftField === "population"}
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
                onPress={() => setDraftOrder("asc")}
              />
              <SortRadioOption
                label={orderLabels.desc}
                selected={draftOrder === "desc"}
                onPress={() => setDraftOrder("desc")}
              />
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.modalActions}>
              <Pressable
                disabled={!hasSortChanges}
                accessibilityState={{ disabled: !hasSortChanges }}
                onPress={handleApplySort}
                style={[
                  styles.actionButton,
                  styles.applyButton,
                  !hasSortChanges && styles.applyButtonDisabled,
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
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    right: 12,
    bottom: "22%",
    alignItems: "center",
    gap: 16,
    zIndex: 10,
  },
  hitArea: {
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
    gap: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  disabledCircle: {
    opacity: 0.85,
  },
  disabledLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#94a3b8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  sectionLabel: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.8)",
    textAlign: "left",
    alignSelf: "flex-start",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 3,
    marginBottom: 0,
  },
  radioGroup: {
    gap: 3,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingVertical: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#fbbf24",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fbbf24",
  },
  radioLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.72)",
  },
  radioLabelSelected: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
  },
  modalActions: {
    marginTop: 6,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  applyButton: {
    backgroundColor: "#fbbf24",
  },
  applyButtonDisabled: {
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  applyText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
  applyTextDisabled: {
    color: "rgba(255,255,255,0.65)",
  },
});
