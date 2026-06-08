import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { WORLDLOOP_HEADER_HORIZONTAL_PADDING } from "@/components/worldloop-header";
import {
  MAP_CHROME_PLACEHOLDER,
  MAP_CHROME_SURFACE,
  MAP_CIRCULAR_FAB,
  MAP_SEARCH_BAR_HEIGHT,
} from "@/constants/map-chrome-styles";
import { useSearchUiStore } from "@/store/use-search-ui-store";

export { MAP_SEARCH_BAR_HEIGHT };

const FOCUS_DELAY_MS = 120;
const DISMISS_TOUCH_SIZE = 44;
const DISMISS_ICON_SIZE = 20;

export function MapSearchBar() {
  const closeSearch = useSearchUiStore((s) => s.closeSearch);
  const requestSearchSubmit = useSearchUiStore((s) => s.requestSearchSubmit);
  const focusToken = useSearchUiStore((s) => s.focusToken);
  const query = useSearchUiStore((s) => s.query);
  const setQuery = useSearchUiStore((s) => s.setQuery);
  const isMapSearchActive = useSearchUiStore(
    (s) => s.isOpen && s.context === "map",
  );

  const inputRef = useRef<TextInput>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    closeSearch();
  }, [closeSearch]);

  useEffect(() => {
    if (!isMapSearchActive) return;
    const timer = setTimeout(focusInput, FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [focusInput, focusToken, isMapSearchActive]);

  if (!isMapSearchActive) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={styles.wrap}
    >
      <View style={styles.row}>
        <View style={styles.bar}>
          <Ionicons name="search" size={20} color={MAP_CHROME_PLACEHOLDER} />

          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search places, cities, countries…"
            placeholderTextColor={MAP_CHROME_PLACEHOLDER}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={requestSearchSubmit}
            selectionColor="rgba(251, 191, 36, 0.5)"
            cursorColor="#ffffff"
            underlineColorAndroid="transparent"
            style={styles.input}
          />

          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              accessibilityHint="Removes the current search query"
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
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel search"
          accessibilityHint="Closes search and returns to the map"
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    zIndex: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bar: {
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
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#f1f5f9",
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
});
