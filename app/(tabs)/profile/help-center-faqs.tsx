import { useState } from "react";

import { HelpCenterFaqItem } from "@/components/profile/help-center-faq-item";
import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import { HELP_CENTER_FAQS } from "@/data/help-center-faqs";

export default function HelpCenterFaqsScreen() {
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const handleToggleFaq = (id: string) => {
    setExpandedFaqId((current) => (current === id ? null : id));
  };

  return (
    <HelpCenterScreenShell
      title="FAQs"
      backAccessibilityLabel="Back to help center"
    >
      <ProfileSettingsSection title="Common questions">
        {HELP_CENTER_FAQS.map((faq, index) => (
          <HelpCenterFaqItem
            key={faq.id}
            faq={faq}
            expanded={expandedFaqId === faq.id}
            onToggle={() => handleToggleFaq(faq.id)}
            isLast={index === HELP_CENTER_FAQS.length - 1}
          />
        ))}
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
