import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { images } from "@/constants/images";
import {
  PROFILE_CARD_BG,
  PROFILE_ICON,
  PROFILE_ICON_BOX_RADIUS,
  PROFILE_ICON_RING,
  PROFILE_NAV_SUBTITLE,
} from "@/constants/profile-theme";
import type { VisitedCountryPreview } from "@/hooks/use-profile-stats";

type ProfileNavRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  trailing?: "thumbnail" | "flags" | "map" | "none";
  thumbnailUri?: string | null;
  visitedCountries?: VisitedCountryPreview[];
  totalVisited?: number;
};

export function ProfileNavRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing = "none",
  thumbnailUri,
  visitedCountries = [],
  totalVisited = 0,
}: ProfileNavRowProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={PROFILE_ICON} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.trailing}>
          {trailing === "thumbnail" ? (
            <Thumbnail uri={thumbnailUri} />
          ) : trailing === "flags" ? (
            <FlagStrip
              countries={visitedCountries}
              totalVisited={totalVisited}
            />
          ) : trailing === "map" ? (
            <MapThumbnail />
          ) : null}
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.45)"
          />
        </View>
      </View>
    </Pressable>
  );
}

function Thumbnail({ uri }: { uri?: string | null }) {
  return (
    <View style={styles.previewCell}>
      <View style={styles.savedThumbnailFrame}>
        <Image
          source={uri ? { uri } : images.earthTopography}
          style={styles.thumbnailImage}
          contentFit="cover"
          accessibilityLabel="Destination preview"
        />
      </View>
    </View>
  );
}

function MapThumbnail() {
  return (
    <View style={styles.previewCell}>
      <View style={styles.mapThumbnailFrame}>
        <Image
          source={images.earthMap}
          style={styles.mapImageZoomed}
          contentFit="cover"
          accessibilityLabel="Travel map preview"
        />
        <View style={styles.mapTint} />
        {MAP_PREVIEW_PINS.map((pin) => (
          <View
            key={pin.id}
            style={[
              styles.mapPin,
              { top: `${pin.top}%`, left: `${pin.left}%` },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const MAP_PREVIEW_PINS = [
  { id: "na", top: 28, left: 18 },
  { id: "eu", top: 24, left: 48 },
  { id: "af", top: 46, left: 52 },
  { id: "as", top: 34, left: 72 },
  { id: "au", top: 62, left: 82 },
] as const;

function FlagStrip({
  countries,
  totalVisited,
}: {
  countries: VisitedCountryPreview[];
  totalVisited: number;
}) {
  const visible = countries.slice(0, 3);
  const remainder = Math.max(0, totalVisited - visible.length);

  return (
    <View style={styles.flagStrip}>
      {visible.map((country) => (
        <View key={country.id} style={styles.flagCell}>
          <FlagBadge
            flag={country.flag}
            iso2={country.cca2}
            width={22}
            height={18}
          />
        </View>
      ))}
      {remainder > 0 ? (
        <View style={styles.moreBadge}>
          <Text style={styles.moreBadgeText} numberOfLines={1}>
            +{remainder}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: PROFILE_CARD_BG,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardPressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: PROFILE_ICON_BOX_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PROFILE_ICON_RING,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 20,
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    color: PROFILE_NAV_SUBTITLE,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  savedThumbnailFrame: {
    width: 60,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
  },
  mapThumbnailFrame: {
    width: 72,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#080c1c",
  },
  previewCell: {
    borderRadius: 12,
    // padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  mapImageZoomed: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.8 }],
    overflow: "hidden",
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 12, 28, 0.3)",
  },
  mapPin: {
    position: "absolute",
    width: 2,
    height: 2,
    marginTop: -2,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: "#fbbf24",
  },
  flagStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  flagCell: {
    width: 28,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  moreBadge: {
    width: 28,
    height: 24,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  moreBadgeText: {
    fontSize: 8,
    fontWeight: "500",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 22,
    includeFontPadding: false,
    ...(Platform.OS === "android"
      ? { textAlignVertical: "center" as const }
      : {}),
  },
});
