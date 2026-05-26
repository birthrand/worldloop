import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { GlassIconButton } from "@/components/explore/glass-icon-button";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type ExploreActionRailProps = {
  country: Country;
};

export function ExploreActionRail({ country }: ExploreActionRailProps) {
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));
  const saved = isSaved;

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

  return (
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

      <View style={styles.hitArea}>
        <View style={styles.circle}>
          <Ionicons name="heart-outline" size={28} color="#ffffff" />
        </View>
        <Text style={styles.likeCount}>12.4K</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    right: 8,
    top: "40%",
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
  likeCount: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
});
