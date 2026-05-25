import "../global.css";

import { Stack } from "expo-router";
import { View } from "react-native";

import { useAppFonts } from "@/hooks/use-app-fonts";

export default function RootLayout() {
  const { loaded } = useAppFonts();

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
      />
    </View>
  );
}
