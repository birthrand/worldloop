import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { useOnboardingStore } from "@/store/use-onboarding-store";

export default function Index() {
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding,
  );
  const [hydrated, setHydrated] = useState(
    useOnboardingStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (hydrated) return;

    return useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, [hydrated]);

  if (!hydrated) {
    return null;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/explore" />;
}
