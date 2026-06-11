import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { OnboardingVisualPager } from "@/components/onboarding/onboarding-visual-pager";
import { ONBOARDING_SLIDES } from "@/data/onboarding-slides";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const handleGetStarted = useCallback(() => {
    router.push("/(auth)/sign-up");
  }, []);

  const handleLogin = useCallback(() => {
    router.push("/(auth)/sign-in");
  }, []);

  return (
    <SafeAreaView edges={[]} style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.body}>
        <OnboardingVisualPager
          slide={ONBOARDING_SLIDES[0]}
          topInset={insets.top}
          bottomInset={insets.bottom}
          onNext={handleGetStarted}
          onLoginPress={handleLogin}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  body: {
    flex: 1,
  },
});
