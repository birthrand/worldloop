import { StyleSheet, View } from "react-native";

import { GlassIconButton } from "@/components/explore/glass-icon-button";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type HeroSaveButtonProps = {
  country: Country;
};

export function HeroSaveButton({ country }: HeroSaveButtonProps) {
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const saved = useSavedCountriesStore((s) => s.isSaved(country.name));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.mutedShell, saved && styles.mutedShellActive]}>
        <GlassIconButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          label="Save"
          variant="compact"
          iconTone="muted"
          active={saved}
          haptic="medium"
          onPress={() => toggleSaved(country)}
          accessibilityLabel={
            saved ? `Unsave ${country.name}` : `Save ${country.name}`
          }
          accessibilityHint={
            saved
              ? "Removes this country from your saved list"
              : "Adds this country to your saved list"
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    zIndex: 2,
  },
  mutedShell: {
    borderRadius: 999,
    padding: 4,
    backgroundColor: "rgba(0, 0, 0, 0.24)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  mutedShellActive: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderColor: "rgba(251, 191, 36, 0.28)",
  },
});
