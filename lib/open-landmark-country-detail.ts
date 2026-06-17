import {
  openCountryDetail,
  warmCountryDetail,
  type CountryDetailOrigin,
} from "@/lib/open-country-detail";
import { useCountryDetailFocusStore } from "@/store/use-country-detail-focus-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import type { PlaceFeedItem } from "@/types/place-feed";

/** Open country detail and scroll to the tapped landmark card. */
export function openLandmarkCountryDetail(
  item: PlaceFeedItem,
  from: CountryDetailOrigin,
): void {
  useRecentlyViewedStore.getState().recordLandmarkView(item);
  useCountryDetailFocusStore.getState().setFocusLandmarkId(item.landmark.id);
  openCountryDetail(item.country, { from });
}

export { warmCountryDetail };
