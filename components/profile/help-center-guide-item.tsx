import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  PROFILE_COMPLETION_ACCENT,
  PROFILE_NAV_SUBTITLE,
} from "@/constants/profile-theme";
import type { HelpCenterGuide } from "@/data/help-center-guides";

type HelpCenterGuideItemProps = {
  guide: HelpCenterGuide;
  expanded: boolean;
  onToggle: () => void;
  isLast?: boolean;
};

export function HelpCenterGuideItem({
  guide,
  expanded,
  onToggle,
  isLast = false,
}: HelpCenterGuideItemProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={!isLast ? styles.rowBorder : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={guide.title}
        accessibilityState={{ expanded }}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.titleBlock}>
          <Text className="font-medium text-[15px] leading-5 text-white">
            {guide.title}
          </Text>
          {!expanded ? (
            <Text
              className="mt-0.5 text-[13px] leading-[18px]"
              style={{ color: PROFILE_NAV_SUBTITLE }}
              numberOfLines={2}
            >
              {guide.summary}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={17}
          color="rgba(255, 255, 255, 0.35)"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.stepsWrap}>
          {guide.steps.map((step, index) => (
            <View key={`${guide.id}-step-${index}`} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text
                  className="text-[12px] font-semibold"
                  style={{ color: PROFILE_COMPLETION_ACCENT }}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                className="flex-1 text-[14px] leading-[21px]"
                style={{ color: PROFILE_NAV_SUBTITLE }}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
  rowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  stepsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginTop: 1,
  },
});
