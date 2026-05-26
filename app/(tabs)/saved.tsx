import { ScrollView, Text, View } from "react-native";

import { useSavedCountriesStore } from "@/store";

export default function SavedScreen() {
  const savedCount = useSavedCountriesStore((s) => s.savedCountries.length);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="grow px-6 py-8 pb-28"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-2">
        <Text className="h2">Saved</Text>
        <Text className="body-md">Coming in a later lesson</Text>
        <Text className="body-sm">
          {savedCount} {savedCount === 1 ? "country" : "countries"} saved
        </Text>
      </View>
    </ScrollView>
  );
}
