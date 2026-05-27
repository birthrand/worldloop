import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { useSearchUiStore } from "@/store/use-search-ui-store";

export function HomeSearchBar() {
  const openSearch = useSearchUiStore((s) => s.openSearch);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search countries"
      onPress={openSearch}
      className="h-12 flex-row items-center gap-3 rounded-2xl bg-white/8 px-4"
    >
      <Ionicons name="search" size={20} color="#94a3b8" />
      <Text className="min-w-0 flex-1 body-md text-white/40">
        Search countries, regions, cultures…
      </Text>
      {/* <View className="flex-row items-center gap-1">
        <Text className="text-lg">🔥</Text>
        <Text className="font-semibold text-sm text-tab-active">Discover</Text>
      </View> */}
    </Pressable>
  );
}
