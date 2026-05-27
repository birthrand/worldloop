import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlagBadge } from "@/components/explore/flag-badge";
import { FeedErrorBanner } from "@/components/home/feed-error-banner";
import { CONTINENTS } from "@/constants/regions";
import { fetchSearchCountries } from "@/lib/api";
import { getAiFact, getCountryImages } from "@/lib/format-country";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

const DEBOUNCE_MS = 300;
const RECENT_SEARCHES_KEY = "worldloop-recent-searches";
const MAX_RECENT_SEARCHES = 8;

type SearchStatus = "idle" | "loading" | "success" | "error";

export function SearchOverlay() {
  const insets = useSafeAreaInsets();
  const isOpen = useSearchUiStore((s) => s.isOpen);
  const closeSearch = useSearchUiStore((s) => s.closeSearch);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [results, setResults] = useState<Country[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef({ query: "", region: "" });

  const loadRecentSearches = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [
        trimmed,
        ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (searchQuery: string, searchRegion: string | null) => {
      const q = searchQuery.trim();
      const r = searchRegion?.trim() ?? "";

      if (!q && !r) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }

      lastRequestRef.current = { query: q, region: r };
      setStatus("loading");
      setError(null);

      try {
        const { data } = await fetchSearchCountries(
          q || undefined,
          r || undefined,
        );
        setResults(data);
        setStatus("success");
        if (q) void saveRecentSearch(q);
      } catch (err) {
        setResults([]);
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Search failed. Try again.",
        );
      }
    },
    [saveRecentSearch],
  );

  const scheduleSearch = useCallback(
    (searchQuery: string, searchRegion: string | null, immediate = false) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const q = searchQuery.trim();
      const r = searchRegion?.trim() ?? "";
      if (!q && !r) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }

      if (immediate) {
        void runSearch(searchQuery, searchRegion);
        return;
      }

      debounceRef.current = setTimeout(() => {
        void runSearch(searchQuery, searchRegion);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  const handleRetry = useCallback(() => {
    const { query: q, region: r } = lastRequestRef.current;
    void runSearch(q, r || null);
  }, [runSearch]);

  useEffect(() => {
    if (!isOpen) return;
    void loadRecentSearches();
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(focusTimer);
  }, [isOpen, loadRecentSearches]);

  useEffect(() => {
    if (!isOpen) return;
    scheduleSearch(query, region);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, region, isOpen, scheduleSearch]);

  const handleClose = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    closeSearch();
  }, [closeSearch]);

  const toggleRegion = useCallback((next: string) => {
    setRegion((current) => (current === next ? null : next));
  }, []);

  const handleSubmit = useCallback(() => {
    scheduleSearch(query, region, true);
  }, [query, region, scheduleSearch]);

  const handleRecentTap = useCallback(
    (term: string) => {
      setQuery(term);
      scheduleSearch(term, region, true);
    },
    [region, scheduleSearch],
  );

  const showIdle =
    status === "idle" && results.length === 0 && !query.trim() && !region;
  const showEmpty =
    status === "success" &&
    results.length === 0 &&
    (!!query.trim() || !!region);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss search"
          style={styles.scrim}
          onPress={handleClose}
        />

        <View
          className="flex-1 bg-midnight-navy"
          style={[
            styles.panel,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View className="flex-row items-center gap-3 px-4 pb-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel search"
              onPress={handleClose}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-center font-semibold text-lg text-white">
              Search
            </Text>
            <View className="h-11 w-11" />
          </View>

          <View className="px-4 pb-4">
            <View className="h-12 flex-row items-center gap-3 rounded-2xl bg-white/8 px-4">
              <Ionicons name="search" size={20} color="#94a3b8" />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search countries, regions, cultures…"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
                style={styles.input}
              />
              {query.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search text"
                  onPress={() => setQuery("")}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
            className="pb-4"
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
                    {name}
                  </Text>
                  {/* {selected ? (
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color="#fbbf24"
                      style={styles.chipClearIcon}
                    />
                  ) : null} */}
                </Pressable>
              );
            })}
          </ScrollView>

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
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#94a3b8"
                        />
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
              style={styles.centeredScroll}
              contentContainerStyle={styles.centeredScrollContent}
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
                    onPress={() => openCountryInExplore(item)}
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
    </Modal>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  panel: {
    marginTop: "8%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    paddingVertical: 0,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsRow: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
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
  chipClearIcon: {
    marginLeft: 2,
  },
  chipSelected: {
    borderColor: "#fbbf24",
  },
  idleScroll: {
    flex: 1,
  },
  idleScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
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
});
