import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ExploreLoading() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center gap-4"
      style={{ paddingTop: insets.top }}
    >
      <ActivityIndicator size="large" color="#fbbf24" />
      <Text className="text-sm text-white/80">Loading countries…</Text>
    </View>
  );
}
