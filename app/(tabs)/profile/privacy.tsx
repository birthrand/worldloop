import { router } from "expo-router";

import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { ProfileSettingsRow } from "@/components/profile/profile-settings-row";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";

export default function PrivacyHubScreen() {
  return (
    <HelpCenterScreenShell
      title="Privacy & terms"
      backAccessibilityLabel="Back to settings"
    >
      <ProfileSettingsSection title="Legal">
        <ProfileSettingsRow
          icon="shield-checkmark-outline"
          label="Privacy policy"
          subtitle="How WorldLoop handles your information"
          onPress={() => router.push("/(tabs)/profile/privacy-policy")}
        />
        <ProfileSettingsRow
          icon="document-text-outline"
          label="Terms of service"
          subtitle="Rules for using WorldLoop"
          onPress={() =>
            router.push("/(tabs)/profile/privacy-terms-of-service")
          }
        />
        <ProfileSettingsRow
          icon="finger-print-outline"
          label="Data & cookies"
          subtitle="Local storage, backend requests, and sessions"
          onPress={() =>
            router.push("/(tabs)/profile/privacy-data-and-cookies")
          }
          isLast
        />
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
