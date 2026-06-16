import { Image } from "expo-image";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { SavedCountryCardMenu } from "@/components/saved/saved-country-card-menu";
import {
  EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_WORLD_BASE_DIM,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import { getCountryImages } from "@/lib/format-country";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import type { Country } from "@/types/country";

export type SavedCountriesLayout = "grid" | "list";

export { useSavedGridListLayout };

type SavedCountriesListProps = {
  countries: Country[];
  layout?: SavedCountriesLayout;
  scrollBottomPadding?: number;
};

const CARD_GAP = 12;
const NUM_COLUMNS = 2;
/** Matches `paddingHorizontal: 24` on the Saved screen content wrapper. */
const SAVED_LIST_HORIZONTAL_INSET = 48;
/** Grid ⋮ menu — equal inset from top and trailing card edge. */
const GRID_MENU_INSET = 6;

function getGridCardWidth(listWidth: number): number {
  return (listWidth - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
}

function useSavedGridListLayout() {
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(
    windowWidth - SAVED_LIST_HORIZONTAL_INSET,
  );

  const onListLayout = useCallback((event: LayoutChangeEvent) => {
    setListWidth(event.nativeEvent.layout.width);
  }, []);

  return {
    onListLayout,
    cardWidth: getGridCardWidth(listWidth),
  };
}

export function SavedCountriesList({
  countries,
  layout = "grid",
  scrollBottomPadding = 24,
}: SavedCountriesListProps) {
  const isGrid = layout === "grid";
  const { onListLayout, cardWidth } = useSavedGridListLayout();

  return (
    <View style={styles.listWrap} onLayout={onListLayout}>
      <FlatList
        key={`saved-countries-${layout}`}
        data={countries}
        keyExtractor={(item) => item.name}
        numColumns={isGrid ? NUM_COLUMNS : 1}
        columnWrapperStyle={isGrid ? styles.row : undefined}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          isGrid ? (
            <SavedCountryGridCard country={item} width={cardWidth} />
          ) : (
            <SavedCountryListRow country={item} />
          )
        }
      />
    </View>
  );
}

function SavedCountryGridCard({
  country,
  width,
}: {
  country: Country;
  width: number;
}) {
  const images = getCountryImages(country);
  const heroUri = images[0];

  return (
    <View style={[styles.card, { width }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${country.name}`}
        onPressIn={() => warmCountryDetail(country)}
        onPress={() => openCountryDetail(country, { from: "saved" })}
        style={({ pressed }) => [
          styles.cardPressable,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardImageRegion}>
          {heroUri ? (
            <Image
              source={{ uri: heroUri }}
              style={styles.cardImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.cardImageFallback} />
          )}
          <View style={styles.cardImageScrim} pointerEvents="none" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <FlagBadge
              flag={country.flag}
              iso2={country.cca2}
              width={28}
              height={18}
            />
            <Text
              style={styles.cardTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {country.name}
            </Text>
          </View>
        </View>
      </Pressable>

      <SavedCountryCardMenu country={country} style={styles.gridMenuTrigger} />
    </View>
  );
}

function SavedCountryListRow({ country }: { country: Country }) {
  const images = getCountryImages(country);
  const heroUri = images[0];
  const capital = country.capital?.trim() || "—";
  const regionLabel = continentDisplayLabel(country.region?.trim() || "—");

  return (
    <View style={styles.listRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${country.name}`}
        onPressIn={() => warmCountryDetail(country)}
        onPress={() => openCountryDetail(country, { from: "saved" })}
        style={({ pressed }) => [
          styles.listRowPressable,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.listThumb}>
          {heroUri ? (
            <Image
              source={{ uri: heroUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cardFallback]} />
          )}
        </View>

        <View style={styles.listBody}>
          <View style={styles.cardTitleRow}>
            <FlagBadge
              flag={country.flag}
              iso2={country.cca2}
              width={28}
              height={18}
            />
            <Text style={styles.listTitle} numberOfLines={1}>
              {country.name}
            </Text>
          </View>
          <Text
            style={styles.cardSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {regionLabel} · {capital}
          </Text>
        </View>
      </Pressable>

      <SavedCountryCardMenu country={country} />
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    flex: 1,
  },
  listContent: {
    gap: CARD_GAP,
  },
  row: {
    gap: CARD_GAP,
  },
  card: {
    minHeight: 168,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  cardPressable: {
    flex: 1,
  },
  gridMenuTrigger: {
    position: "absolute",
    top: GRID_MENU_INSET,
    right: 2,
    zIndex: 2,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    paddingRight: 4,
    borderRadius: 16,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  listRowPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  listBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardFallback: {
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  cardImageRegion: {
    flex: 1,
    minHeight: 112,
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  cardImageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_SWIPE_WORLD_BASE_DIM,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageFallback: {
    flex: 1,
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  cardBody: {
    flexShrink: 0,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  listTitle: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  cardSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
});
