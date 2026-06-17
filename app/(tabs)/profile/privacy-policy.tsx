import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { PrivacyDocumentContent } from "@/components/profile/privacy-document-content";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import { getLegalDocument } from "@/data/legal-documents";

export default function PrivacyPolicyScreen() {
  const document = getLegalDocument("privacy-policy");

  return (
    <HelpCenterScreenShell
      title="Privacy policy"
      backAccessibilityLabel="Back to privacy and terms"
    >
      <ProfileSettingsSection title="Overview">
        <PrivacyDocumentContent document={document} />
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
