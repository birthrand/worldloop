import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  SIGN_UP_COLORS,
  SIGN_UP_SPACING,
  SIGN_UP_TYPOGRAPHY,
} from "@/constants/sign-up-theme";

type SignUpFooterLinkProps = {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
};

export function SignUpFooterLink({
  prompt,
  actionLabel,
  onPress,
}: SignUpFooterLinkProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.wrap}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
    >
      <Text style={styles.prompt}>
        {prompt} <Text style={styles.action}>{actionLabel}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: SIGN_UP_SPACING.footerTapPadding,
    minHeight: 44,
    justifyContent: "center",
  },
  prompt: {
    color: SIGN_UP_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: SIGN_UP_TYPOGRAPHY.footer.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.footer.lineHeight,
    textAlign: "center",
  },
  action: {
    color: SIGN_UP_COLORS.link,
    fontFamily: "Poppins-Medium",
  },
});
