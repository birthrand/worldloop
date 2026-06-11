import { router } from "expo-router";
import { useCallback, useState } from "react";

import { useOnboardingStore } from "@/store/use-onboarding-store";

export function useAuthVerificationFlow() {
  const completeOnboarding = useOnboardingStore(
    (state) => state.completeOnboarding,
  );
  const [isVerificationVisible, setIsVerificationVisible] = useState(false);

  const openVerification = useCallback(() => {
    setIsVerificationVisible(true);
  }, []);

  const closeVerification = useCallback(() => {
    setIsVerificationVisible(false);
  }, []);

  const completeVerification = useCallback(() => {
    setIsVerificationVisible(false);
    completeOnboarding();
    router.replace("/");
  }, [completeOnboarding]);

  return {
    isVerificationVisible,
    openVerification,
    closeVerification,
    completeVerification,
  };
}
