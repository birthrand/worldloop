import { useAuth, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { oauthRedirectUrl } from "@/lib/clerk";

export type AuthVerificationMode = "sign-up" | "sign-in-trust" | null;

type FinalizeTarget = {
  finalize: (options: {
    navigate: (params: {
      session?: { currentTask?: { key: string } | null };
      decorateUrl: (path: string) => string;
    }) => void;
  }) => Promise<unknown>;
};

export function useClerkAuthFlow(isLogin: boolean) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    signIn,
    errors: signInErrors,
    fetchStatus: signInFetchStatus,
  } = useSignIn();
  const {
    signUp,
    errors: signUpErrors,
    fetchStatus: signUpFetchStatus,
  } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [verificationMode, setVerificationMode] =
    useState<AuthVerificationMode>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isSubmitting = isLogin
    ? signInFetchStatus === "fetching"
    : signUpFetchStatus === "fetching";

  const fieldErrors = isLogin ? signInErrors?.fields : signUpErrors?.fields;
  const verificationErrors =
    verificationMode === "sign-up"
      ? signUpErrors?.fields
      : signInErrors?.fields;

  const finalizeSession = useCallback(
    async (target: FinalizeTarget) => {
      await target.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.warn("Pending session task:", session.currentTask);
            return;
          }

          const url = decorateUrl("/");
          router.replace(url as Href);
        },
      });
    },
    [router],
  );

  const openVerification = useCallback(
    (mode: Exclude<AuthVerificationMode, null>, email: string) => {
      setFormError(null);
      setVerificationEmail(email);
      setVerificationMode(mode);
    },
    [],
  );

  const closeVerification = useCallback(() => {
    setVerificationMode(null);
    setVerificationEmail("");
    setFormError(null);
  }, []);

  const handleSignIn = useCallback(
    async (emailAddress: string, password: string) => {
      setFormError(null);

      const { error } = await signIn.password({
        emailAddress,
        password,
      });

      if (error) {
        setFormError(error.message ?? "Unable to sign in. Try again.");
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSession(signIn);
        return;
      }

      if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (emailCodeFactor) {
          const { error: sendError } = await signIn.mfa.sendEmailCode();
          if (sendError) {
            setFormError(
              sendError.message ?? "Unable to send verification code.",
            );
            return;
          }

          openVerification("sign-in-trust", emailAddress);
          return;
        }
      }

      if (signIn.status === "needs_second_factor") {
        setFormError(
          "Multi-factor authentication is required for this account.",
        );
        return;
      }

      setFormError("Sign-in could not be completed. Please try again.");
    },
    [finalizeSession, openVerification, signIn],
  );

  const handleSignUp = useCallback(
    async (emailAddress: string, password: string) => {
      setFormError(null);

      const { error } = await signUp.password({
        emailAddress,
        password,
      });

      if (error) {
        setFormError(error.message ?? "Unable to create account. Try again.");
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setFormError(sendError.message ?? "Unable to send verification code.");
        return;
      }

      openVerification("sign-up", emailAddress);
    },
    [openVerification, signUp],
  );

  const handleVerifyCode = useCallback(
    async (code: string) => {
      setFormError(null);

      if (verificationMode === "sign-up") {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) {
          setFormError(error.message ?? "Invalid verification code.");
          return;
        }

        if (signUp.status === "complete") {
          await finalizeSession(signUp);
          closeVerification();
        }

        return;
      }

      if (verificationMode === "sign-in-trust") {
        const { error } = await signIn.mfa.verifyEmailCode({ code });
        if (error) {
          setFormError(error.message ?? "Invalid verification code.");
          return;
        }

        if (signIn.status === "complete") {
          await finalizeSession(signIn);
          closeVerification();
        }
      }
    },
    [closeVerification, finalizeSession, signIn, signUp, verificationMode],
  );

  const handleResendCode = useCallback(async () => {
    setFormError(null);

    if (verificationMode === "sign-up") {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setFormError(error.message ?? "Unable to resend verification code.");
      }
      return;
    }

    if (verificationMode === "sign-in-trust") {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) {
        setFormError(error.message ?? "Unable to resend verification code.");
      }
    }
  }, [signIn, signUp, verificationMode]);

  const handleSSO = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      setFormError(null);

      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: oauthRedirectUrl,
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          router.replace("/");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Social sign-in failed. Try again.";
        setFormError(message);
      }
    },
    [router, startSSOFlow],
  );

  const submitCredentials = useCallback(
    async (emailAddress: string, password: string) => {
      if (isLogin) {
        await handleSignIn(emailAddress, password);
        return;
      }

      await handleSignUp(emailAddress, password);
    },
    [handleSignIn, handleSignUp, isLogin],
  );

  return {
    isSignedIn,
    isSubmitting,
    formError,
    fieldErrors,
    verificationErrors,
    verificationMode,
    verificationEmail,
    isVerificationVisible: verificationMode !== null,
    submitCredentials,
    handleVerifyCode,
    handleResendCode,
    handleSSO,
    closeVerification,
  };
}
