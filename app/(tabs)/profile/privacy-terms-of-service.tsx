import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { PrivacyDocumentContent } from "@/components/profile/privacy-document-content";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import { getLegalDocument } from "@/data/legal-documents";

export default function TermsOfServiceScreen() {
  const document = getLegalDocument("terms-of-service");

  return (
    <HelpCenterScreenShell
      title="Terms of service"
      backAccessibilityLabel="Back to privacy and terms"
    >
      <ProfileSettingsSection title="Overview">
        <PrivacyDocumentContent document={document} />
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
