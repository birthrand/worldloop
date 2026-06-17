import { useState } from "react";

import { HelpCenterGuideItem } from "@/components/profile/help-center-guide-item";
import { HelpCenterScreenShell } from "@/components/profile/help-center-screen-shell";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import { HELP_CENTER_GUIDES } from "@/data/help-center-guides";

export default function HelpCenterGuidesScreen() {
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);

  const handleToggleGuide = (id: string) => {
    setExpandedGuideId((current) => (current === id ? null : id));
  };

  return (
    <HelpCenterScreenShell
      title="Guides"
      backAccessibilityLabel="Back to help center"
    >
      <ProfileSettingsSection title="Walkthroughs">
        {HELP_CENTER_GUIDES.map((guide, index) => (
          <HelpCenterGuideItem
            key={guide.id}
            guide={guide}
            expanded={expandedGuideId === guide.id}
            onToggle={() => handleToggleGuide(guide.id)}
            isLast={index === HELP_CENTER_GUIDES.length - 1}
          />
        ))}
      </ProfileSettingsSection>
    </HelpCenterScreenShell>
  );
}
