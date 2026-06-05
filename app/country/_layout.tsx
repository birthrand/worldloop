import { Stack } from "expo-router";

export default function CountryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0b132b" },
        animation: "slide_from_right",
      }}
    />
  );
}
