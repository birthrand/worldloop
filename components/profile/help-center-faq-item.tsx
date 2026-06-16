import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PROFILE_NAV_SUBTITLE } from "@/constants/profile-theme";
import type { HelpCenterFaq } from "@/data/help-center-faqs";

type HelpCenterFaqItemProps = {
  faq: HelpCenterFaq;
  expanded: boolean;
  onToggle: () => void;
  isLast?: boolean;
};

export function HelpCenterFaqItem({
  faq,
  expanded,
  onToggle,
  isLast = false,
}: HelpCenterFaqItemProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={!isLast ? styles.rowBorder : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={faq.question}
        accessibilityState={{ expanded }}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text className="flex-1 pr-3 font-medium text-[15px] leading-5 text-white">
          {faq.question}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={17}
          color="rgba(255, 255, 255, 0.35)"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.answerWrap}>
          <Text
            className="text-[14px] leading-[21px]"
            style={{ color: PROFILE_NAV_SUBTITLE }}
          >
            {faq.answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
  rowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  answerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
  },
});
