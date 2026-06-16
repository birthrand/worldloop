import { StyleSheet, Text, View } from "react-native";

import { LEGAL_LAST_UPDATED } from "@/constants/legal";
import { PROFILE_NAV_SUBTITLE } from "@/constants/profile-theme";
import type { LegalDocument } from "@/data/legal-documents";

type PrivacyDocumentContentProps = {
  document: LegalDocument;
};

export function PrivacyDocumentContent({
  document,
}: PrivacyDocumentContentProps) {
  return (
    <View style={styles.root}>
      <Text className="text-[12px] text-white/45">
        Last updated {LEGAL_LAST_UPDATED}
      </Text>

      {document.sections.map((section, index) => (
        <View
          key={section.id}
          style={[
            styles.section,
            index < document.sections.length - 1 && styles.sectionBorder,
          ]}
        >
          <Text className="font-medium text-[15px] leading-5 text-white">
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <Text
              key={`${section.id}-${paragraphIndex}`}
              className="text-[14px] leading-[21px]"
              style={{
                color: PROFILE_NAV_SUBTITLE,
                marginTop: paragraphIndex === 0 ? 8 : 10,
              }}
            >
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  section: {
    paddingBottom: 16,
  },
  sectionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
});
