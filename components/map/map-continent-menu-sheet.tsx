import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WORLDLOOP_HEADER_ACCENT_COLOR } from "@/components/worldloop-header";
import { continentDisplayLabel, type Continent } from "@/constants/regions";
import {
  CONTINENT_MENU_CARDS,
  WORLD_MENU_CARD,
} from "@/data/continent-menu-cards";
import type { MapCluster } from "@/lib/map-clusters";

const SHEET_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

const GRID_GAP = 10;
const SHEET_HORIZONTAL_PADDING = 16;
const CARD_IMAGE_HEIGHT = 78;

type MapContinentMenuSheetProps = {
  visible: boolean;
  focusedRegion: string | null;
  clusters: MapCluster[];
  onClose: () => void;
  onSelectWorld: () => void;
  onSelectContinent: (region: Continent) => void;
};

type PickerCardProps = {
  label: string;
  snippet: string;
  imageUri: string;
  selected: boolean;
  badge?: string;
  accessibilityLabel: string;
  onPress: () => void;
};

function PickerCard({
  label,
  snippet,
  imageUri,
  selected,
  badge,
  accessibilityLabel,
  onPress,
}: PickerCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: imageUri }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={["transparent", "rgba(11, 19, 43, 0.92)"]}
          style={styles.imageGradient}
        />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        {selected ? (
          <View style={styles.selectedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={WORLDLOOP_HEADER_ACCENT_COLOR}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.snippet} numberOfLines={2}>
          {snippet}
        </Text>
        <Text
          style={[styles.cardLabel, selected && styles.cardLabelSelected]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function MapContinentMenuSheet({
  visible,
  focusedRegion,
  clusters,
  onClose,
  onSelectWorld,
  onSelectContinent,
}: MapContinentMenuSheetProps) {
  const insets = useSafeAreaInsets();
  const worldSelected = focusedRegion === null;

  const getCountryCount = (region: Continent) => {
    return (
      clusters.find((cluster) => cluster.region === region)?.countryCount ?? 0
    );
  };

  const handleWorldPress = () => {
    if (worldSelected) {
      onClose();
      return;
    }
    onSelectWorld();
    onClose();
  };

  const handleContinentPress = (region: Continent) => {
    if (focusedRegion === region) {
      onClose();
      return;
    }
    onSelectContinent(region);
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
          accessibilityLabel="Close continent picker"
          onPress={onClose}
        />
        <Animated.View
          entering={SHEET_ENTER}
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          accessibilityViewIsModal
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleGroup}>
              <Text style={styles.sheetTitle}>Choose your quest</Text>
              <Text style={styles.sheetSubtitle}>
                Pick a region and jump the map there
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close continent picker"
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <PickerCard
              label="World view"
              snippet={WORLD_MENU_CARD.snippet}
              imageUri={WORLD_MENU_CARD.imageUri}
              selected={worldSelected}
              accessibilityLabel={
                worldSelected
                  ? "World view is active"
                  : "Zoom out to world view"
              }
              onPress={handleWorldPress}
            />

            <View style={styles.cardList}>
              {CONTINENT_MENU_CARDS.map((card) => {
                const count = getCountryCount(card.region);
                const badge =
                  count > 0
                    ? `${count} ${count === 1 ? "country" : "countries"}`
                    : undefined;

                return (
                  <PickerCard
                    key={card.region}
                    label={continentDisplayLabel(card.region)}
                    snippet={card.snippet}
                    imageUri={card.imageUri}
                    selected={focusedRegion === card.region}
                    badge={badge}
                    accessibilityLabel={`Focus map on ${continentDisplayLabel(card.region)}`}
                    onPress={() => handleContinentPress(card.region)}
                  />
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxHeight: "82%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  sheetTitleGroup: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
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
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  cardList: {
    gap: GRID_GAP,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardSelected: {
    borderColor: WORLDLOOP_HEADER_ACCENT_COLOR,
    borderWidth: 2,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
  },
  imageWrap: {
    height: CARD_IMAGE_HEIGHT,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 19, 43, 0.72)",
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
  },
  snippet: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.62)",
  },
  cardLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    includeFontPadding: false,
  },
  cardLabelSelected: {
    color: WORLDLOOP_HEADER_ACCENT_COLOR,
  },
});
