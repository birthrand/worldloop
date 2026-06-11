import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";

import { AUTH_COLORS, AUTH_TYPOGRAPHY } from "@/constants/auth-theme";

type AuthFooterLinkProps = {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
};

export function AuthFooterLink({
  prompt,
  actionLabel,
  onPress,
}: AuthFooterLinkProps) {
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
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  prompt: {
    color: AUTH_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: AUTH_TYPOGRAPHY.footer.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.footer.lineHeight,
    textAlign: "center",
  },
  action: {
    color: AUTH_COLORS.goldOnLight,
    fontFamily: "Poppins-Medium",
  },
});
