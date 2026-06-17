import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { historyEntryThumbnail } from "@/types/history";

const HISTORY_PROFILE_SUBTITLE = "Revisit places you recently explored";

export function useHistoryProfileRow() {
  const recentEntries = useRecentlyViewedStore((s) => s.entries);
  const firstEntry = recentEntries[0];

  return {
    subtitle: HISTORY_PROFILE_SUBTITLE,
    thumbnailUri: firstEntry ? historyEntryThumbnail(firstEntry) : null,
  };
}
