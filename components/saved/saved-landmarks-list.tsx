import { Image } from "expo-image";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import {
  useSavedGridListLayout,
  type SavedCountriesLayout,
} from "@/components/saved/saved-countries-list";
import { SavedLandmarkCardMenu } from "@/components/saved/saved-landmark-card-menu";
import {
  EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_WORLD_BASE_DIM,
} from "@/constants/explore-swipe-layout";
import { images as appImages } from "@/constants/images";
import type { CountryLandmark } from "@/lib/api";
import {
  formatLandmarkTypeDisplay,
  getCountryImages,
} from "@/lib/format-country";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

type SavedLandmarksListProps = {
  items: PlaceFeedItem[];
  layout?: SavedCountriesLayout;
  scrollBottomPadding?: number;
};

const CARD_GAP = 12;
const NUM_COLUMNS = 2;
const GRID_MENU_INSET = 6;
const WIKIMEDIA_HEADERS = {
  "User-Agent": "WorldLoop/1.0 (Expo; country discovery app)",
};

function resolveLandmarkHeroUri(
  landmark: CountryLandmark,
  country: Country,
): string | null {
  if (landmark.imageUrl) {
    return normalizeImageUrl(landmark.imageUrl);
  }

  const countryImages = getCountryImages(country);
  return countryImages[0] ? normalizeImageUrl(countryImages[0]) : null;
}

function landmarkImageSource(uri: string) {
  return {
    uri,
    headers: uri.includes("wikimedia.org") ? WIKIMEDIA_HEADERS : undefined,
  };
}

export function SavedLandmarksList({
  items,
  layout = "grid",
  scrollBottomPadding = 24,
}: SavedLandmarksListProps) {
  const isGrid = layout === "grid";
  const { onListLayout, cardWidth } = useSavedGridListLayout();

  return (
    <View style={styles.listWrap} onLayout={onListLayout}>
      <FlatList
        key={`saved-landmarks-${layout}`}
        data={items}
        keyExtractor={(item) => item.landmark.id}
        numColumns={isGrid ? NUM_COLUMNS : 1}
        columnWrapperStyle={isGrid ? styles.row : undefined}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          isGrid ? (
            <SavedLandmarkGridCard item={item} width={cardWidth} />
          ) : (
            <SavedLandmarkListRow item={item} />
          )
        }
      />
    </View>
  );
}

function SavedLandmarkGridCard({
  item,
  width,
}: {
  item: PlaceFeedItem;
  width: number;
}) {
  const { landmark, country } = item;
  const heroUri = resolveLandmarkHeroUri(landmark, country);
  const subtitle = `${formatLandmarkTypeDisplay(landmark.type)} · ${country.name}`;

  return (
    <View style={[styles.card, { width }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${landmark.name} in ${country.name}`}
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
              source={landmarkImageSource(heroUri)}
              style={styles.cardImage}
              contentFit="cover"
            />
          ) : (
            <Image
              source={appImages.earthTopography}
              style={styles.cardImage}
              contentFit="cover"
            />
          )}
          <View style={styles.cardImageScrim} pointerEvents="none" />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
            {landmark.name}
          </Text>
          <Text
            style={styles.cardSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>

      <SavedLandmarkCardMenu item={item} style={styles.gridMenuTrigger} />
    </View>
  );
}

function SavedLandmarkListRow({ item }: { item: PlaceFeedItem }) {
  const { landmark, country } = item;
  const heroUri = resolveLandmarkHeroUri(landmark, country);
  const subtitle = `${formatLandmarkTypeDisplay(landmark.type)} · ${country.name}`;

  return (
    <View style={styles.listRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${landmark.name} in ${country.name}`}
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
              source={landmarkImageSource(heroUri)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <Image
              source={appImages.earthTopography}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          )}
        </View>

        <View style={styles.listBody}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {landmark.name}
          </Text>
          <View style={styles.countryRow}>
            <FlagBadge
              flag={country.flag}
              iso2={country.cca2}
              width={24}
              height={16}
            />
            <Text
              style={styles.cardSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          </View>
        </View>
      </Pressable>

      <SavedLandmarkCardMenu item={item} />
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
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  cardPressed: {
    opacity: 0.9,
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
  cardBody: {
    flexShrink: 0,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  cardTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  listTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  cardSubtitle: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
});
