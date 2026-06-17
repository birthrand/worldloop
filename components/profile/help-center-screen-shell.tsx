import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import {
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  CULTURE_CHROME_TITLE_SIZE,
  CULTURE_CHROME_TOUCH_SIZE,
} from "@/constants/culture-chrome";
import { PROFILE_SCREEN_BG } from "@/constants/profile-theme";

type HelpCenterScreenShellProps = {
  title: string;
  backAccessibilityLabel: string;
  children: ReactNode;
};

export function HelpCenterScreenShell({
  title,
  backAccessibilityLabel,
  children,
}: HelpCenterScreenShellProps) {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 24;

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar style="light" />
      <View
        style={{
          paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
          paddingBottom: 4,
        }}
      >
        <WorldLoopHeader
          title={title}
          showBack
          onBackPress={handleBack}
          backAccessibilityLabel={backAccessibilityLabel}
          showMenu={false}
          showSearch={false}
          inactiveColor="#ffffff"
          rowHeight={CULTURE_CHROME_TOUCH_SIZE}
          sideSlotWidth={CULTURE_CHROME_TOUCH_SIZE}
          brandFontSize={CULTURE_CHROME_TITLE_SIZE}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PROFILE_SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 4,
  },
  body: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 20,
  },
});
