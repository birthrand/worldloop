import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { PrivacyDocumentContent } from "@/components/profile/privacy-document-content";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import { getLegalDocument } from "@/data/legal-documents";

export default function DataAndCookiesScreen() {
  const document = getLegalDocument("data-and-cookies");

  return (
    <HelpCenterScreenShell
      title="Data & cookies"
      backAccessibilityLabel="Back to privacy and terms"
    >
      <ProfileSettingsSection title="Overview">
        <PrivacyDocumentContent document={document} />
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
