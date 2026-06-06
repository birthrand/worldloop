import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

type SavedEmptyStateProps = {
  message: string;
  showExploreCta?: boolean;
};

export function SavedEmptyState({
  message,
  showExploreCta = false,
}: SavedEmptyStateProps) {
  return (
    <View className="items-center gap-4 rounded-2xl bg-white/5 px-6 py-8">
      <Text className="body-md text-center text-white/60">{message}</Text>

      {showExploreCta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore countries"
          onPress={() => router.push("/(tabs)/explore")}
          className="min-h-[44px] items-center justify-center rounded-full bg-tab-active px-6 py-3"
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <Text className="font-semibold text-sm text-midnight-navy">
            Explore countries
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
