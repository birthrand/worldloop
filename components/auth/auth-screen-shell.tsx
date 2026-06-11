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
import { AuthTabs } from "@/components/auth/auth-tabs";
import {
  AUTH_BACKGROUND_GRADIENT,
  AUTH_COLORS,
  AUTH_SPACING,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";
import type { AuthTab } from "@/types/auth";

type AuthScreenShellProps = {
  children: ReactNode;
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  title: string;
  subtitle: string;
};

export function AuthScreenShell({
  children,
  activeTab,
  onTabChange,
  title,
  subtitle,
}: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AuthBackground />

      <View
        style={[
          styles.headerBackdrop,
          { height: AUTH_SPACING.headerBackdropHeight },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={AUTH_BACKGROUND_GRADIENT.colors}
          locations={AUTH_BACKGROUND_GRADIENT.locations}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={[styles.headerContent, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthTabs activeTab={activeTab} onTabChange={onTabChange} />

            <View style={styles.form}>{children}</View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AUTH_COLORS.headerBg,
  },
  headerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  headerContent: {
    paddingHorizontal: AUTH_SPACING.sheetPadding,
    paddingBottom: AUTH_SPACING.sheetOverlap + 28,
    gap: 12,
    zIndex: 2,
  },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontFamily: "Poppins-SemiBold",
    fontSize: AUTH_TYPOGRAPHY.headerTitle.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.headerTitle.lineHeight,
    marginTop: 8,
    maxWidth: 300,
  },
  subtitle: {
    color: AUTH_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: AUTH_TYPOGRAPHY.subtitle.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.subtitle.lineHeight,
  },
  sheetWrap: {
    flex: 1,
    zIndex: 3,
  },
  sheet: {
    flex: 1,
    marginTop: -AUTH_SPACING.sheetOverlap,
    backgroundColor: AUTH_COLORS.sheetBgTop,
    borderTopLeftRadius: AUTH_SPACING.sheetRadius,
    borderTopRightRadius: AUTH_SPACING.sheetRadius,
    overflow: "hidden",
  },
  sheetContent: {
    paddingHorizontal: AUTH_SPACING.sheetPadding,
    paddingTop: AUTH_SPACING.sheetPadding,
    gap: AUTH_SPACING.sectionGap,
  },
  form: {
    gap: AUTH_SPACING.sectionGap,
  },
});
