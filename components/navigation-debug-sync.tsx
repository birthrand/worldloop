import { usePathname } from "expo-router";
import { useEffect } from "react";

import { syncAppScreenFromPathname } from "@/lib/navigation-debug";

/** Keeps dev navigation debug state aligned with the active route. */
export function NavigationDebugSync() {
  const pathname = usePathname();

  useEffect(() => {
    syncAppScreenFromPathname(pathname);
  }, [pathname]);

  return null;
}
