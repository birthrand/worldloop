import { router } from "expo-router";

import { useIdentityStore } from "@/store/use-identity-store";

/** Map back — restore country detail when the map was opened from there. */
export function navigateBackFromMap(): void {
  const {
    selectionSource,
    countryDetailReturnName,
    setCountryDetailReturnName,
  } = useIdentityStore.getState();

  if (selectionSource === "countryDetail" && countryDetailReturnName) {
    const name = countryDetailReturnName;
    setCountryDetailReturnName(null);
    router.dismissTo({
      pathname: "/country/[name]",
      params: { name },
    });
    return;
  }

  router.back();
}
