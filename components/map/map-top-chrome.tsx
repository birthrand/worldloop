import { useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapContinentMenuSheet } from "@/components/map/map-continent-menu-sheet";
import { MapSearchBar } from "@/components/map/map-search-row";
import {
  WORLDLOOP_HEADER_BOTTOM_PADDING,
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  MAP_SEARCH_PANEL_GAP,
  MAP_SEARCH_ROW_HEIGHT,
} from "@/constants/map-chrome-styles";
import type { Continent } from "@/constants/regions";
import type { MapCluster } from "@/lib/map-clusters";
import { useSearchUiStore } from "@/store/use-search-ui-store";

/** Top offset for the search results panel — sits just below the search bar. */
export function getMapSearchPanelTop(safeAreaTop: number) {
  return (
    safeAreaTop +
    WORLDLOOP_HEADER_TOP_PADDING +
    MAP_SEARCH_ROW_HEIGHT +
    MAP_SEARCH_PANEL_GAP
  );
}

type MapTopChromeProps = {
  focusedRegion: string | null;
  clusters: MapCluster[];
  onSelectContinent: (cluster: MapCluster) => void;
  onSelectWorld: () => void;
};

export function MapTopChrome({
  focusedRegion,
  clusters,
  onSelectContinent,
  onSelectWorld,
}: MapTopChromeProps) {
  const insets = useSafeAreaInsets();
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const isMapSearchOpen = useSearchUiStore(
    (s) => s.isOpen && s.context === "map",
  );

  const [isContinentMenuOpen, setIsContinentMenuOpen] = useState(false);

  const handleContinentSelect = useCallback(
    (region: Continent) => {
      const cluster = clusters.find((entry) => entry.region === region);
      if (!cluster) return;
      onSelectContinent(cluster);
    },
    [clusters, onSelectContinent],
  );

  return (
    <View
      style={{
        paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
        paddingBottom: isMapSearchOpen ? 0 : WORLDLOOP_HEADER_BOTTOM_PADDING,
      }}
    >
      {!isMapSearchOpen ? (
        <WorldLoopHeader
          onMenuPress={() => setIsContinentMenuOpen(true)}
          menuActive={isContinentMenuOpen || !!focusedRegion}
          onSearchPress={() => openSearch("map")}
          searchActive={false}
          menuAccessibilityLabel="Choose continent"
          menuAccessibilityHint="Opens continent picker for the map"
          searchAccessibilityLabel="Search places on map"
          searchAccessibilityHint="Opens map search"
        />
      ) : null}

      {isMapSearchOpen ? <MapSearchBar /> : null}

      <MapContinentMenuSheet
        visible={isContinentMenuOpen}
        focusedRegion={focusedRegion}
        clusters={clusters}
        onClose={() => setIsContinentMenuOpen(false)}
        onSelectWorld={onSelectWorld}
        onSelectContinent={handleContinentSelect}
      />
    </View>
  );
}
