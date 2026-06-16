import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlagBadge } from "@/components/explore/flag-badge";
import { FeedErrorBanner } from "@/components/feed-error-banner";
import {
  WORLDLOOP_HEADER_HORIZONTAL_PADDING,
  WORLDLOOP_HEADER_TOP_PADDING,
} from "@/components/worldloop-header";
import {
  MAP_CHROME_ACCENT,
  MAP_CHROME_PLACEHOLDER,
  MAP_CHROME_SURFACE,
  MAP_CHROME_TEXT,
  MAP_CIRCULAR_FAB,
  MAP_SEARCH_BAR_HEIGHT,
  MAP_SEARCH_PANEL_GAP,
} from "@/constants/map-chrome-styles";
import { CONTINENTS, continentDisplayLabel } from "@/constants/regions";
import { SPACE_TAB_BAR_BG } from "@/constants/space-theme";
import { useCountrySearch } from "@/hooks/use-country-search";
import { getAiFact, getCountryImages } from "@/lib/format-country";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

/** Matches map search dismiss control sizing. */
const DISMISS_TOUCH_SIZE = 44;
const DISMISS_ICON_SIZE = 20;

export function SearchOverlay() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isOpen = useSearchUiStore((s) => s.isOpen);
  const context = useSearchUiStore((s) => s.context);
  const focusToken = useSearchUiStore((s) => s.focusToken);
  const closeSearch = useSearchUiStore((s) => s.closeSearch);

  const enabled = isOpen && context !== "map";
  const {
    query,
    setQuery,
    region,
    results,
    status,
    error,
    recentSearches,
    handleRetry,
    toggleRegion,
    handleSubmit,
    handleRecentTap,
    showIdle,
    showEmpty,
  } = useCountrySearch(enabled);

  const inputRef = useRef<TextInput>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsFilterOpen(false);
    closeSearch();
  }, [closeSearch]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleClose();
        return true;
      },
    );

    return () => subscription.remove();
  }, [enabled, handleClose]);

  useEffect(() => {
    if (!enabled) {
      setIsFilterOpen(false);
      return;
    }

    let cancelled = false;
    let focusTimer: ReturnType<typeof setTimeout> | null = null;

    const interaction = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      focusTimer = setTimeout(() => {
        if (!cancelled) {
          inputRef.current?.focus();
        }
      }, 120);
    });

    return () => {
      cancelled = true;
      interaction.cancel();
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [enabled, focusToken]);

  const handleOpenCountry = useCallback((country: Country) => {
    openCountryDetail(country, { from: "search" });
  }, []);

  useEffect(() => {
    const { resumeSearchOnReturn } = useSearchUiStore.getState();
    if (!resumeSearchOnReturn || pathname.startsWith("/country/")) return;

    useSearchUiStore.setState((state) => ({
      resumeSearchOnReturn: false,
      isOpen: true,
      focusToken: state.focusToken + 1,
    }));
  }, [pathname]);

  if (!enabled) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View
        className="flex-1"
        style={{
          backgroundColor: SPACE_TAB_BAR_BG,
          paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={20}
                color={MAP_CHROME_PLACEHOLDER}
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search countries, regions, cultures…"
                placeholderTextColor={MAP_CHROME_PLACEHOLDER}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus={isOpen}
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
                selectionColor="rgba(251, 191, 36, 0.5)"
                cursorColor="#ffffff"
                underlineColorAndroid="transparent"
                style={styles.input}
              />
              {query.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search text"
                  onPress={() => setQuery("")}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.clearButtonPressed,
                  ]}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={MAP_CHROME_PLACEHOLDER}
                  />
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Region filter"
                accessibilityHint={
                  region
                    ? `Filtered by ${region}. Tap to change region filter.`
                    : "Opens continent filters"
                }
                accessibilityState={{
                  expanded: isFilterOpen,
                  selected: !!region,
                }}
                onPress={() => setIsFilterOpen((open) => !open)}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.clearButton,
                  !!region && styles.filterButtonActive,
                  pressed && styles.clearButtonPressed,
                ]}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={region ? MAP_CHROME_ACCENT : MAP_CHROME_PLACEHOLDER}
                />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel search"
              accessibilityHint="Closes search"
              onPress={handleClose}
              hitSlop={4}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.dismissButtonPressed,
              ]}
            >
              <Ionicons name="close" size={DISMISS_ICON_SIZE} color="#ffffff" />
            </Pressable>
          </View>

          {isFilterOpen ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}
            >
              {CONTINENTS.map((name) => {
                const selected = region === name;
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={
                      selected
                        ? `Clear ${name} region filter`
                        : `Filter by ${name}`
                    }
                    onPress={() => toggleRegion(name)}
                    hitSlop={4}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      className={`font-medium text-sm ${
                        selected ? "text-tab-active" : "text-white/70"
                      }`}
                    >
                      {continentDisplayLabel(name)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {status === "error" && error ? (
          <View className="px-4 pb-4">
            <FeedErrorBanner message={error} onRetry={handleRetry} />
          </View>
        ) : null}

        {showIdle ? (
          <ScrollView
            style={styles.idleScroll}
            contentContainerStyle={styles.idleScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {recentSearches.length > 0 ? (
              <View className="gap-3">
                <Text className="font-semibold text-sm text-white/80">
                  Recent searches
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <Pressable
                      key={term}
                      accessibilityRole="button"
                      accessibilityLabel={`Search for ${term}`}
                      onPress={() => handleRecentTap(term)}
                      style={({ pressed }) => [
                        styles.recentChip,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons name="time-outline" size={14} color="#94a3b8" />
                      <Text className="body-sm text-white/80">{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        ) : status === "loading" ? (
          <ScrollView
            style={styles.centeredScroll}
            contentContainerStyle={styles.centeredScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ActivityIndicator size="large" color="#fbbf24" />
          </ScrollView>
        ) : showEmpty ? (
          <ScrollView
            style={styles.idleScroll}
            contentContainerStyle={styles.emptyScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="font-semibold text-lg text-white">
              No countries found
            </Text>
            <Text className="mt-2 text-center body-md text-white/50">
              Try another spelling or pick a different region.
            </Text>
          </ScrollView>
        ) : (
          <View className="min-h-0 flex-1">
            <FlatList
              data={results}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <SearchResultRow
                  country={item}
                  onPress={() => handleOpenCountry(item)}
                  onPressIn={() => warmCountryDetail(item)}
                />
              )}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
            />
          </View>
        )}
      </View>
    </View>
  );
}

type SearchResultRowProps = {
  country: Country;
  onPress: () => void;
  onPressIn?: () => void;
};

function SearchResultRow({
  country,
  onPress,
  onPressIn,
}: SearchResultRowProps) {
  const images = getCountryImages(country);
  const heroUri = images[0];
  const fact = getAiFact(country);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${country.name}`}
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.9 }]}
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

/** Matches map search results `body.paddingTop`. */
const SEARCH_BODY_TOP_PADDING = 6;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  searchSection: {
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    paddingBottom: MAP_SEARCH_PANEL_GAP,
    gap: MAP_SEARCH_PANEL_GAP,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBar: {
    minWidth: 0,
    flex: 1,
    height: MAP_SEARCH_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: MAP_SEARCH_BAR_HEIGHT / 2,
    backgroundColor: MAP_CHROME_SURFACE,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
    overflow: "hidden",
  },
  input: {
    minWidth: 0,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
    color: MAP_CHROME_TEXT,
    backgroundColor: "transparent",
    paddingVertical: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonPressed: {
    opacity: 0.82,
  },
  filterButtonActive: {
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dismissButton: {
    width: DISMISS_TOUCH_SIZE,
    height: DISMISS_TOUCH_SIZE,
    borderRadius: DISMISS_TOUCH_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MAP_CIRCULAR_FAB.controlBackgroundColor,
    borderWidth: 1,
    borderColor: MAP_CIRCULAR_FAB.controlBorderColor,
  },
  dismissButtonPressed: {
    backgroundColor: MAP_CIRCULAR_FAB.controlPressedBackgroundColor,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsRow: {
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: "#fbbf24",
  },
  idleScroll: {
    flex: 1,
  },
  idleScrollContent: {
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    paddingTop: SEARCH_BODY_TOP_PADDING,
    paddingBottom: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    paddingTop: 100,
  },
  centeredScroll: {
    flex: 1,
  },
  centeredScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    paddingTop: SEARCH_BODY_TOP_PADDING,
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
});
