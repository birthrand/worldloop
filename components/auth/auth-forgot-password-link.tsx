import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";

import { SIGN_UP_COLORS } from "@/constants/sign-up-theme";

type AuthForgotPasswordLinkProps = {
  onPress?: () => void;
};

export function AuthForgotPasswordLink({
  onPress,
}: AuthForgotPasswordLinkProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Forgot password"
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      style={styles.wrap}
    >
      <Text style={styles.label}>Forgot password?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-end",
    marginTop: -2,
    paddingVertical: 0,
    minHeight: 28,
    justifyContent: "center",
  },
  label: {
    color: SIGN_UP_COLORS.link,
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 20,
  },
});
