import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { FlagBadge } from "@/components/explore/flag-badge";
import { FeedErrorBanner } from "@/components/feed-error-banner";
import { WORLDLOOP_HEADER_HORIZONTAL_PADDING } from "@/components/worldloop-header";
import {
  MAP_SEARCH_BLUR_INTENSITY,
  MAP_SEARCH_OVERLAY_PANEL,
  MAP_SEARCH_OVERLAY_SCRIM,
} from "@/constants/map-chrome-styles";
import { SPACE_WEB_BLUR_FALLBACK } from "@/constants/space-theme";
import { useCountrySearch } from "@/hooks/use-country-search";
import { getAiFact, getCountryImages } from "@/lib/format-country";
import { openCountryOnMap } from "@/lib/open-country-on-map";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

const MAP_RECENT_SEARCHES_LIMIT = 5;

type MapSearchBlurBackdropProps = {
  style?: StyleProp<ViewStyle>;
  tintColor: string;
};

function MapSearchBlurBackdrop({
  style,
  tintColor,
}: MapSearchBlurBackdropProps) {
  return (
    <View style={[style, styles.blurLayer]} pointerEvents="none">
      {Platform.OS === "web" ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: SPACE_WEB_BLUR_FALLBACK },
          ]}
        />
      ) : (
        <BlurView
          intensity={MAP_SEARCH_BLUR_INTENSITY}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tintColor }]} />
    </View>
  );
}

type MapSearchResultsPanelProps = {
  panelTop: number;
};

export function MapSearchResultsPanel({
  panelTop,
}: MapSearchResultsPanelProps) {
  const closeSearch = useSearchUiStore((s) => s.closeSearch);
  const isOpen = useSearchUiStore((s) => s.isOpen);
  const context = useSearchUiStore((s) => s.context);
  const enabled = isOpen && context === "map";

  const {
    results,
    status,
    error,
    recentSearches,
    handleRetry,
    handleRecentTap,
    showIdle,
    showEmpty,
  } = useCountrySearch(enabled);

  if (!enabled) return null;

  const dismissSearch = () => {
    Keyboard.dismiss();
    closeSearch();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <MapSearchBlurBackdrop
          style={StyleSheet.absoluteFill}
          tintColor={MAP_SEARCH_OVERLAY_SCRIM}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss search"
          style={styles.scrimPressable}
          onPress={dismissSearch}
        />
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={[styles.panel, { top: panelTop }]}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.panelTint]}
        />
        <View style={styles.body}>
          {status === "error" && error ? (
            <View className="px-4 pb-4">
              <FeedErrorBanner message={error} onRetry={handleRetry} />
            </View>
          ) : null}

          {showIdle ? (
            <ScrollView
              style={styles.flexScroll}
              contentContainerStyle={styles.idleContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {recentSearches.length > 0 ? (
                <View className="gap-3">
                  <Text className="font-semibold text-sm text-white/80">
                    Recent searches
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.recentRow}
                  >
                    {recentSearches
                      .slice(0, MAP_RECENT_SEARCHES_LIMIT)
                      .map((term) => (
                        <Pressable
                          key={term}
                          accessibilityRole="button"
                          accessibilityLabel={`Search for ${term}`}
                          onPress={() => handleRecentTap(term)}
                          style={({ pressed }) => [
                            styles.recentChip,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color="#94a3b8"
                          />
                          <Text
                            className="body-sm text-white/80"
                            numberOfLines={1}
                          >
                            {term}
                          </Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.hintWrap}>
                  <Ionicons
                    name="earth-outline"
                    size={28}
                    color="rgba(148, 163, 184, 0.55)"
                  />
                  <Text className="mt-3 text-center body-md text-white/55">
                    Search for a country, city, or region to fly there on the
                    map.
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : status === "loading" ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color="#fbbf24" />
            </View>
          ) : showEmpty ? (
            <View style={styles.emptyState}>
              <Text className="font-semibold text-lg text-white">
                No countries found
              </Text>
              <Text className="mt-2 text-center body-md text-white/50">
                Try another spelling or search term.
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <SearchResultRow
                  country={item}
                  onPress={() => openCountryOnMap(item)}
                />
              )}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={styles.flexScroll}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

type SearchResultRowProps = {
  country: Country;
  onPress: () => void;
};

function SearchResultRow({ country, onPress }: SearchResultRowProps) {
  const images = getCountryImages(country);
  const heroUri = images[0];
  const fact = getAiFact(country);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${country.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        {heroUri ? (
          <Image
            source={{ uri: heroUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-white/5">
            <Text className="text-2xl">🌍</Text>
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <FlagBadge
            flag={country.flag}
            iso2={country.cca2}
            width={28}
            height={18}
          />
          <Text
            className="min-w-0 flex-1 font-semibold text-base text-white"
            numberOfLines={1}
          >
            {country.name}
          </Text>
        </View>
        <Text className="body-sm text-white/50" numberOfLines={1}>
          {country.capital} · {country.region}
        </Text>
        {fact !== "Fun fact loading…" ? (
          <Text className="caption text-white/40" numberOfLines={1}>
            {fact}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blurLayer: {
    overflow: "hidden",
  },
  scrimPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  panelTint: {
    backgroundColor: MAP_SEARCH_OVERLAY_PANEL,
  },
  body: {
    flex: 1,
    minHeight: 160,
    paddingTop: 6,
    zIndex: 1,
  },
  flexScroll: {
    flex: 1,
  },
  idleContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  hintWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    paddingTop: 100,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    flexShrink: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minHeight: 72,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  pressed: {
    opacity: 0.88,
  },
});
