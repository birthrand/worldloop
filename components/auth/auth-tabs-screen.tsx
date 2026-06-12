import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthForgotPasswordLink } from "@/components/auth/auth-forgot-password-link";
import { AuthVerificationModal } from "@/components/auth/auth-verification-modal";
import { SignUpField } from "@/components/auth/sign-up/sign-up-field";
import { SignUpFooterLink } from "@/components/auth/sign-up/sign-up-footer-link";
import { SignUpOrDivider } from "@/components/auth/sign-up/sign-up-or-divider";
import { SignUpPrimaryButton } from "@/components/auth/sign-up/sign-up-primary-button";
import { SignUpScreenShell } from "@/components/auth/sign-up/sign-up-screen-shell";
import { SignUpSocialButton } from "@/components/auth/sign-up/sign-up-social-button";
import { SIGN_UP_SPACING } from "@/constants/sign-up-theme";
import { useClerkAuthFlow } from "@/hooks/use-clerk-auth-flow";
import type { AuthTab } from "@/types/auth";

const LOGIN_HEADER = {
  title: "Sign in to your account",
  subtitle: "Manage your settings and explore features",
};

const REGISTER_HEADER = {
  title: "Create your account",
  subtitle: "Sign up to get started and explore features",
};

type AuthTabsScreenProps = {
  initialTab: AuthTab;
};

export function AuthTabsScreen({ initialTab }: AuthTabsScreenProps) {
  const router = useRouter();
  const isLogin = initialTab === "login";

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const {
    isSubmitting,
    formError,
    verificationErrors,
    verificationEmail,
    isVerificationVisible,
    submitCredentials,
    handleVerifyCode,
    handleResendCode,
    handleSSO,
    closeVerification,
  } = useClerkAuthFlow(isLogin);

  const activeEmail = isLogin ? loginEmail.trim() : registerEmail.trim();
  const activePassword = isLogin ? loginPassword : registerPassword;

  const canLogin = useMemo(
    () => loginEmail.trim().length > 0 && loginPassword.length > 0,
    [loginEmail, loginPassword],
  );

  const canRegister = useMemo(() => {
    return (
      registerEmail.trim().length > 0 &&
      registerPassword.length >= 6 &&
      registerConfirmPassword.length > 0 &&
      registerPassword === registerConfirmPassword
    );
  }, [registerEmail, registerPassword, registerConfirmPassword]);

  const handlePrimaryPress = () => {
    void submitCredentials(activeEmail, activePassword);
  };

  const handleGooglePress = () => {
    void handleSSO("oauth_google");
  };

  const handleApplePress = () => {
    void handleSSO("oauth_apple");
  };

  const verificationError =
    verificationErrors?.code?.message ?? formError ?? null;

  const loginForm = (
    <>
      <View style={styles.primaryBlock}>
        <View style={styles.formFields}>
          <SignUpField
            label="Email"
            placeholder="name@example.com"
            value={loginEmail}
            onChangeText={setLoginEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
          />
          <View style={styles.passwordGroup}>
            <SignUpField
              label="Password"
              placeholder="••••••••"
              accessibilityLabel="Password"
              value={loginPassword}
              onChangeText={setLoginPassword}
              isPassword
              textContentType="password"
              autoComplete="password"
            />
            <View style={styles.forgotRow}>
              <AuthForgotPasswordLink />
            </View>
          </View>
        </View>

        {formError && !isVerificationVisible ? (
          <Text style={styles.formError}>{formError}</Text>
        ) : null}

        <SignUpPrimaryButton
          label="Continue"
          disabled={!canLogin || isSubmitting}
          onPress={handlePrimaryPress}
        />
      </View>

      <SignUpOrDivider />

      <View style={styles.socialStack}>
        <SignUpSocialButton
          provider="google"
          disabled={isSubmitting}
          onPress={handleGooglePress}
        />
        <SignUpSocialButton
          provider="apple"
          disabled={isSubmitting}
          onPress={handleApplePress}
        />
      </View>

      <SignUpFooterLink
        prompt="Don't have an account?"
        actionLabel="Sign up"
        onPress={() => router.replace("/(auth)/sign-up")}
      />
    </>
  );

  const registerForm = (
    <>
      <View style={styles.primaryBlock}>
        <View style={styles.formFields}>
          <SignUpField
            label="Email"
            placeholder="name@example.com"
            value={registerEmail}
            onChangeText={setRegisterEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
          />
          <SignUpField
            label="Password"
            placeholder="••••••••"
            accessibilityLabel="Password"
            value={registerPassword}
            onChangeText={setRegisterPassword}
            isPassword
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <SignUpField
            label="Confirm Password"
            placeholder="••••••••"
            accessibilityLabel="Confirm password"
            value={registerConfirmPassword}
            onChangeText={setRegisterConfirmPassword}
            isPassword
            textContentType="newPassword"
            autoComplete="password"
          />
        </View>

        {formError && !isVerificationVisible ? (
          <Text style={styles.formError}>{formError}</Text>
        ) : null}

        <SignUpPrimaryButton
          label="Create Account"
          disabled={!canRegister || isSubmitting}
          onPress={handlePrimaryPress}
        />
      </View>

      <SignUpOrDivider />

      <View style={styles.socialStack}>
        <SignUpSocialButton
          provider="google"
          disabled={isSubmitting}
          onPress={handleGooglePress}
        />
        <SignUpSocialButton
          provider="apple"
          disabled={isSubmitting}
          onPress={handleApplePress}
        />
      </View>

      <SignUpFooterLink
        prompt="Already have an account?"
        actionLabel="Log in"
        onPress={() => router.replace("/(auth)/sign-in")}
      />

      <View nativeID="clerk-captcha" />
    </>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <SignUpScreenShell
        title={isLogin ? LOGIN_HEADER.title : REGISTER_HEADER.title}
        subtitle={isLogin ? LOGIN_HEADER.subtitle : REGISTER_HEADER.subtitle}
      >
        {isLogin ? loginForm : registerForm}
      </SignUpScreenShell>

      <AuthVerificationModal
        visible={isVerificationVisible}
        email={verificationEmail || activeEmail}
        error={verificationError}
        loading={isSubmitting}
        onClose={closeVerification}
        onVerify={handleVerifyCode}
        onResend={handleResendCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  primaryBlock: {
    gap: SIGN_UP_SPACING.fieldToCtaGap,
  },
  formFields: {
    gap: SIGN_UP_SPACING.fieldGap,
  },
  passwordGroup: {
    gap: SIGN_UP_SPACING.passwordToForgotGap,
  },
  forgotRow: {
    alignItems: "flex-end",
  },
  socialStack: {
    alignSelf: "stretch",
    gap: SIGN_UP_SPACING.socialGap,
  },
  formError: {
    color: "#F87171",
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
