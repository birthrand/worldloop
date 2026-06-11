import { StyleSheet } from "react-native";

import { AUTH_SPACING } from "@/constants/auth-theme";

export const authFormStyles = StyleSheet.create({
  fields: {
    gap: AUTH_SPACING.fieldGap,
  },
  passwordFieldGroup: {
    gap: 8,
  },
  actions: {
    marginTop: AUTH_SPACING.fieldToCtaGap,
  },
  dividerWrap: {
    marginTop: AUTH_SPACING.ctaToDividerGap,
  },
  socialWrap: {
    marginTop: AUTH_SPACING.dividerToSocialGap,
  },
});
