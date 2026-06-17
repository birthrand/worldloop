import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { ProfileLogOutButton } from "@/components/profile/profile-log-out-button";
import { ProfileSettingsRow } from "@/components/profile/profile-settings-row";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import {
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  CULTURE_CHROME_TITLE_SIZE,
  CULTURE_CHROME_TOUCH_SIZE,
} from "@/constants/culture-chrome";
import { PROFILE_SCREEN_BG } from "@/constants/profile-theme";
import {
  getLanguageLabel,
  useProfileSettingsStore,
} from "@/store/use-profile-settings-store";

function showComingSoon(label: string) {
  Alert.alert(label, "This feature is coming in a later lesson.");
}

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const languageCode = useProfileSettingsStore((s) => s.languageCode);

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
          title="Settings"
          showBack
          onBackPress={handleBack}
          backAccessibilityLabel="Back to profile"
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
        <View style={styles.sections}>
          <ProfileSettingsSection title="Preferences">
            <ProfileSettingsRow
              icon="notifications-outline"
              label="Notifications"
              subtitle="Push alerts and discovery reminders"
              onPress={() => showComingSoon("Notifications")}
            />
            <ProfileSettingsRow
              icon="globe-outline"
              label="Language"
              value={getLanguageLabel(languageCode)}
              disabled
              showChevron={false}
              isLast
            />
          </ProfileSettingsSection>

          <ProfileSettingsSection title="Support">
            <ProfileSettingsRow
              icon="help-circle-outline"
              label="Help center"
              subtitle="FAQs, guides, and contact support"
              onPress={() => router.push("/(tabs)/profile/help-center")}
            />
            <ProfileSettingsRow
              icon="shield-checkmark-outline"
              label="Privacy & terms"
              subtitle="Data, cookies, and legal policies"
              onPress={() => router.push("/(tabs)/profile/privacy")}
              isLast
            />
          </ProfileSettingsSection>

          <View style={styles.logOutWrap}>
            <ProfileLogOutButton />
          </View>
        </View>
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
  sections: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 20,
  },
  logOutWrap: {
    marginTop: 4,
  },
});
