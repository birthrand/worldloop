import { Stack } from "expo-router";

import { EXPLORE_SWIPE_SCREEN_BG } from "@/constants/explore-swipe-layout";

export default function CountryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: EXPLORE_SWIPE_SCREEN_BG },
        animation: "slide_from_right",
      }}
    />
  );
}
