import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { useAppFonts } from "@/hooks/use-app-fonts";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";

export default function RootLayout() {
  const { loaded } = useAppFonts();

  useEffect(() => {
    const finishHydration = useDiscoveryProgressStore.persist.onFinishHydration(
      () => {
        useDiscoveryProgressStore.getState().recordAppOpen();
      },
    );
    if (useDiscoveryProgressStore.persist.hasHydrated()) {
      useDiscoveryProgressStore.getState().recordAppOpen();
    }
    return finishHydration;
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <View className="flex-1 bg-background font-regular">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F1F5F9" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="country" options={{ headerShown: false }} />
        <Stack.Screen name="dev" />
      </Stack>
    </View>
  );
}
