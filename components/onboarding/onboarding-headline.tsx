import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
} from "@/constants/onboarding-theme";
import type { OnboardingHeadlineLine } from "@/data/onboarding-slides";

type OnboardingHeadlineProps = {
  lines: OnboardingHeadlineLine[];
};

function isAccentLine(line: OnboardingHeadlineLine) {
  return line.segments.length === 1 && line.segments[0]?.accent === true;
}

export function OnboardingHeadline({ lines }: OnboardingHeadlineProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.wrap} accessibilityRole="header">
      {lines.map((line, lineIndex) => {
        const accentLine = isAccentLine(line);
        const type = accentLine
          ? compact
            ? ONBOARDING_TYPOGRAPHY.headlineAccentCompact
            : ONBOARDING_TYPOGRAPHY.headlineAccent
          : compact
            ? ONBOARDING_TYPOGRAPHY.headlinePrimaryCompact
            : ONBOARDING_TYPOGRAPHY.headlinePrimary;

        return (
          <Text
            key={`line-${lineIndex}`}
            style={[
              styles.line,
              accentLine ? styles.lineAccent : styles.linePrimary,
              {
                fontFamily: type.fontFamily,
                fontSize: type.fontSize,
                lineHeight: type.lineHeight,
                letterSpacing: type.letterSpacing,
              },
            ]}
          >
            {line.segments.map((segment, segmentIndex) => (
              <Text
                key={`${lineIndex}-${segmentIndex}`}
                style={segment.accent ? styles.lineAccent : undefined}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: "100%",
    gap: 4,
  },
  line: {
    textAlign: "center",
  },
  linePrimary: {
    color: ONBOARDING_COLORS.textPrimary,
  },
  lineAccent: {
    color: ONBOARDING_COLORS.gold,
  },
});
