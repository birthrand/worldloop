import "../global.css";

import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppToast } from "@/components/app-toast";
import { useAppFonts } from "@/hooks/use-app-fonts";
import { clerkPublishableKey } from "@/lib/clerk";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";

export default function RootLayout() {
  const { loaded } = useAppFonts();

  useEffect(() => {
    if (useDiscoveryProgressStore.persist.hasHydrated()) {
      useDiscoveryProgressStore.getState().recordAppOpen();
      return;
    }

    return useDiscoveryProgressStore.persist.onFinishHydration(() => {
      useDiscoveryProgressStore.getState().recordAppOpen();
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <GestureHandlerRootView style={styles.root}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F1F5F9" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="oauth-callback"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="country"
            options={{
              headerShown: false,
              // animation: "fade",
              // presentation: "fullScreenModal",
            }}
          />
          {__DEV__ ? <Stack.Screen name="dev" /> : null}
        </Stack>
        <AppToast />
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
