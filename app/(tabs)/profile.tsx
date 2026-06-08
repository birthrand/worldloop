import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useOnboardingStore } from "@/store/use-onboarding-store";

export default function ProfileScreen() {
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  const handleOpenOnboarding = () => {
    resetOnboarding();
    router.replace("/onboarding");
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="grow px-6 py-8 pb-28"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-2">
        <Text className="h2">Profile</Text>
        <Text className="body-md">Coming in a later lesson</Text>
      </View>

      {__DEV__ ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View onboarding again"
          onPress={handleOpenOnboarding}
          className="mt-8 self-start"
        >
          <Text className="font-semibold text-sm text-ocean-blue">
            View onboarding again
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
