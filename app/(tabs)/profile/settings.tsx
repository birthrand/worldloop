import { useUser } from "@clerk/expo";
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
import { ProfileSettingsHeader } from "@/components/profile/profile-settings-header";
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

const DEFAULT_BIO = "Exploring the world, one destination at a time.";
const DEFAULT_LOCATION = "San Francisco, USA";

function showComingSoon(label: string) {
  Alert.alert(label, "This feature is coming in a later lesson.");
}

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const darkModeEnabled = useProfileSettingsStore((s) => s.darkModeEnabled);
  const languageCode = useProfileSettingsStore((s) => s.languageCode);
  const setDarkModeEnabled = useProfileSettingsStore(
    (s) => s.setDarkModeEnabled,
  );

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "Traveler";

  const email =
    user?.primaryEmailAddress?.emailAddress ?? "alex.morgan@example.com";

  const bio =
    typeof user?.unsafeMetadata?.bio === "string" && user.unsafeMetadata.bio
      ? user.unsafeMetadata.bio
      : DEFAULT_BIO;

  const location =
    typeof user?.unsafeMetadata?.location === "string" &&
    user.unsafeMetadata.location
      ? user.unsafeMetadata.location
      : DEFAULT_LOCATION;

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
          title="Edit profile"
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
        <ProfileSettingsHeader />

        <View style={styles.sections}>
          <ProfileSettingsSection title="About you">
            <ProfileSettingsRow
              icon="person-outline"
              label="Full name"
              value={displayName}
              variant="field"
              onPress={() => showComingSoon("Full name")}
            />
            <ProfileSettingsRow
              icon="mail-outline"
              label="Email"
              value={email}
              variant="field"
              onPress={() => showComingSoon("Email")}
            />
            <ProfileSettingsRow
              icon="create-outline"
              label="Bio"
              value={bio}
              variant="field"
              onPress={() => showComingSoon("Bio")}
            />
            <ProfileSettingsRow
              icon="location-outline"
              label="Location"
              value={location}
              variant="field"
              onPress={() => showComingSoon("Location")}
              isLast
            />
          </ProfileSettingsSection>

          <ProfileSettingsSection title="Travel">
            <ProfileSettingsRow
              icon="flag-outline"
              label="Home country"
              subtitle="Set your home base for travel stats"
              onPress={() => showComingSoon("Home country")}
            />
            <ProfileSettingsRow
              icon="compass-outline"
              label="Travel interests"
              subtitle="Culture, food, nature, and more"
              onPress={() => showComingSoon("Travel interests")}
              isLast
            />
          </ProfileSettingsSection>

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
              onPress={() => showComingSoon("Language")}
            />
            <ProfileSettingsRow
              icon="moon-outline"
              label="Dark mode"
              subtitle="Use dark theme across the app"
              showChevron={false}
              showToggle
              toggleValue={darkModeEnabled}
              onToggle={setDarkModeEnabled}
            />
            <ProfileSettingsRow
              icon="download-outline"
              label="Offline maps"
              subtitle="Download regions for offline use"
              onPress={() => showComingSoon("Offline maps")}
              isLast
            />
          </ProfileSettingsSection>

          <ProfileSettingsSection title="Support">
            <ProfileSettingsRow
              icon="help-circle-outline"
              label="Help center"
              subtitle="FAQs, guides, and contact support"
              onPress={() => showComingSoon("Help center")}
            />
            <ProfileSettingsRow
              icon="shield-checkmark-outline"
              label="Privacy & terms"
              subtitle="Data, cookies, and legal policies"
              onPress={() => showComingSoon("Privacy & terms")}
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
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  logOutWrap: {
    marginTop: 4,
  },
});
