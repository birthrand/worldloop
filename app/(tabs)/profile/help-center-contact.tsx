import { HelpCenterContactRow } from "@/components/profile/help-center-contact-row";
import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";

export default function HelpCenterContactScreen() {
  return (
    <HelpCenterScreenShell
      title="Contact support"
      backAccessibilityLabel="Back to help center"
    >
      <ProfileSettingsSection title="Get in touch">
        <HelpCenterContactRow />
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
