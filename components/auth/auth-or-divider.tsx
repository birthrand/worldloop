import { StyleSheet, Text, View } from "react-native";

import { AUTH_COLORS, AUTH_TYPOGRAPHY } from "@/constants/auth-theme";

type AuthOrDividerProps = {
  label?: string;
};

export function AuthOrDivider({
  label = "Or sign in with",
}: AuthOrDividerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AUTH_COLORS.dividerLine,
  },
  label: {
    color: AUTH_COLORS.sheetTextMuted,
    fontFamily: "Poppins-Regular",
    fontSize: AUTH_TYPOGRAPHY.divider.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.divider.lineHeight,
  },
});
