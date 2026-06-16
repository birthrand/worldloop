import { router } from "expo-router";

import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { ProfileSettingsRow } from "@/components/profile/profile-settings-row";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";

export default function HelpCenterHubScreen() {
  return (
    <HelpCenterScreenShell
      title="Help center"
      backAccessibilityLabel="Back to settings"
    >
      <ProfileSettingsSection title="Support">
        <ProfileSettingsRow
          icon="chatbubble-ellipses-outline"
          label="FAQs"
          subtitle="Common questions about WorldLoop"
          onPress={() => router.push("/(tabs)/profile/help-center-faqs")}
        />
        <ProfileSettingsRow
          icon="book-outline"
          label="Guides"
          subtitle="Step-by-step walkthroughs"
          onPress={() => router.push("/(tabs)/profile/help-center-guides")}
        />
        <ProfileSettingsRow
          icon="mail-outline"
          label="Contact support"
          subtitle="Questions, feedback, or bug reports"
          onPress={() => router.push("/(tabs)/profile/help-center-contact")}
          isLast
        />
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
