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
      <Stack.Screen name="history" />
      <Stack.Screen name="visited" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help-center" />
      <Stack.Screen name="help-center-faqs" />
      <Stack.Screen name="help-center-guides" />
      <Stack.Screen name="help-center-contact" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="privacy-terms-of-service" />
      <Stack.Screen name="privacy-data-and-cookies" />
    </Stack>
  );
}
