import { Stack } from "expo-router";

import { PROFILE_SCREEN_BG } from "@/constants/profile-theme";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: PROFILE_SCREEN_BG },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
