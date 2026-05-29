import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

import { MAP_CONTINENT_INTENT_DELAY_MS } from "@/constants/map-continent-focus";
import type { MapCluster } from "@/lib/map-clusters";

type UseContinentIntentOptions = {
  onCommit: (cluster: MapCluster) => void;
  /** Active continent — cross-continent taps commit immediately (no world preview). */
  focusedRegion?: string | null;
};

export function useContinentIntent({
  onCommit,
  focusedRegion = null,
}: UseContinentIntentOptions) {
  const [previewRegion, setPreviewRegion] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClusterRef = useRef<MapCluster | null>(null);

  const cancelIntent = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingClusterRef.current = null;
    setPreviewRegion(null);
  }, []);

  const requestContinentFocus = useCallback(
    (cluster: MapCluster) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Preview layers only apply at world zoom; switching while focused
      // must commit immediately to avoid conflicting polygon/scrim state.
      if (focusedRegion && focusedRegion !== cluster.region) {
        pendingClusterRef.current = null;
        setPreviewRegion(null);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCommit(cluster);
        return;
      }

      pendingClusterRef.current = cluster;
      setPreviewRegion(cluster.region);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      timerRef.current = setTimeout(() => {
        const pending = pendingClusterRef.current;
        timerRef.current = null;
        pendingClusterRef.current = null;
        setPreviewRegion(null);
        if (pending) {
          onCommit(pending);
        }
      }, MAP_CONTINENT_INTENT_DELAY_MS);
    },
    [focusedRegion, onCommit],
  );

  useEffect(() => () => cancelIntent(), [cancelIntent]);

  return {
    previewRegion,
    requestContinentFocus,
    cancelIntent,
  };
}
