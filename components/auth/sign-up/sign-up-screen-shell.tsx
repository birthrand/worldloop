import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthBackground } from "@/components/auth/auth-background";
import { AUTH_SIGN_UP_BOTTOM_GRADIENT } from "@/constants/auth-theme";
import {
  SIGN_UP_COLORS,
  SIGN_UP_SPACING,
  SIGN_UP_TYPOGRAPHY,
} from "@/constants/sign-up-theme";

type SignUpScreenShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

export function SignUpScreenShell({
  children,
  title,
  subtitle,
}: SignUpScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AuthBackground showFullGradient />

      <LinearGradient
        colors={AUTH_SIGN_UP_BOTTOM_GRADIENT.colors}
        locations={AUTH_SIGN_UP_BOTTOM_GRADIENT.locations}
        style={styles.bottomVignette}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + SIGN_UP_SPACING.brandTopInset,
              paddingBottom: insets.bottom + SIGN_UP_SPACING.screenBottomInset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <Text style={styles.brandName}>WorldLoop</Text>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SIGN_UP_COLORS.screenBg,
  },
  flex: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIGN_UP_SPACING.screenPadding,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: SIGN_UP_SPACING.headerToFormGap,
  },
  bottomVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
    zIndex: 1,
  },
  brandName: {
    color: SIGN_UP_COLORS.brandAccent,
    fontFamily: "Poppins-SemiBold",
    fontSize: SIGN_UP_TYPOGRAPHY.brand.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.brand.lineHeight,
    letterSpacing: SIGN_UP_TYPOGRAPHY.brand.letterSpacing,
    textAlign: "center",
  },
  title: {
    color: SIGN_UP_COLORS.textPrimary,
    fontFamily: "Poppins-SemiBold",
    fontSize: SIGN_UP_TYPOGRAPHY.title.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.title.lineHeight,
    letterSpacing: SIGN_UP_TYPOGRAPHY.title.letterSpacing,
    marginTop: SIGN_UP_SPACING.brandToTitleGap,
    textAlign: "center",
  },
  subtitle: {
    color: SIGN_UP_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: SIGN_UP_TYPOGRAPHY.subtitle.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.subtitle.lineHeight,
    marginTop: SIGN_UP_SPACING.subtitleTopGap,
    maxWidth: SIGN_UP_SPACING.subtitleMaxWidth,
    textAlign: "center",
  },
  form: {
    gap: SIGN_UP_SPACING.formBlockGap,
  },
});
