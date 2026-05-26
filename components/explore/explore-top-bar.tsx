import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassIconButton } from "@/components/explore/glass-icon-button";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type ExploreTopBarProps = {
  country: Country;
};

export function ExploreTopBar({ country }: ExploreTopBarProps) {
  const insets = useSafeAreaInsets();
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));
  const saved = isSaved;

  return (
    <View
      className="flex-row items-center justify-between px-4"
      style={{ paddingTop: insets.top + 8 }}
    >
      <GlassIconButton
        icon="search"
        label=""
        onPress={() => {
          console.log("Search tapped");
        }}
        accessibilityLabel="Search countries"
      />

      <GlassIconButton
        icon={saved ? "bookmark" : "bookmark-outline"}
        label=""
        active={saved}
        onPress={() => toggleSaved(country)}
        accessibilityLabel={
          saved ? `Unsave ${country.name}` : `Save ${country.name}`
        }
      />
    </View>
  );
}
