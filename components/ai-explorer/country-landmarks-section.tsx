import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProfileSection } from "@/components/ai-explorer/profile-section";
import { prefetchCountryImage } from "@/components/explore/country-image";
import { COUNTRY_DETAIL_MODULE_BG } from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
} from "@/constants/explore-swipe-layout";
import { images as appImages } from "@/constants/images";
import type { CountryLandmark } from "@/lib/api";
import { formatLandmarkDescription } from "@/lib/format-country";
import { normalizeImageUrl } from "@/lib/normalize-image-url";

const IMAGE_CROSSFADE_MS = 320;
const PREVIEW_WIDTH = 48;
const PREVIEW_BLUR_RADIUS = 18;
const WIKIMEDIA_HEADERS = {
  "User-Agent": "WorldLoop/1.0 (Expo; country discovery app)",
};

function landmarkImageSource(uri: string) {
  return {
    uri,
    headers: uri.includes("wikimedia.org") ? WIKIMEDIA_HEADERS : undefined,
  };
}

/** Low-quality preview URL for blurred placeholder (Wikimedia width param or thumb). */
function landmarkPreviewUri(fullUri: string): string {
  if (fullUri.includes("/thumb/")) {
    return fullUri.replace(/\/\d+px-/, `/${PREVIEW_WIDTH}px-`);
  }

  try {
    const url = new URL(fullUri);
    if (url.hostname.includes("wikimedia.org")) {
      url.searchParams.set("width", String(PREVIEW_WIDTH));
      return url.href;
    }
  } catch {
    return fullUri;
  }

  return fullUri;
}

type LandmarkImageProps = {
  imageUrl: string | null;
  name: string;
};

function LandmarkImage({ imageUrl, name }: LandmarkImageProps) {
  const normalizedUri = useMemo(
    () => (imageUrl ? normalizeImageUrl(imageUrl) : null),
    [imageUrl],
  );
  const previewUri = useMemo(
    () => (normalizedUri ? landmarkPreviewUri(normalizedUri) : null),
    [normalizedUri],
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!normalizedUri) {
      setFailed(true);
      return;
    }

    setFailed(false);
    void prefetchCountryImage(normalizedUri);
    if (previewUri && previewUri !== normalizedUri) {
      void prefetchCountryImage(previewUri);
    }
  }, [normalizedUri, previewUri]);

  if (!normalizedUri || failed) {
    return (
      <Image
        source={appImages.earthTopography}
        style={styles.placeholderImage}
        contentFit="cover"
        accessibilityLabel={`${name} placeholder`}
      />
    );
  }

  const previewSource = previewUri
    ? landmarkImageSource(previewUri)
    : landmarkImageSource(normalizedUri);

  return (
    <View style={styles.imageStack}>
      <Image
        source={previewSource}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        blurRadius={PREVIEW_BLUR_RADIUS}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Image
        source={landmarkImageSource(normalizedUri)}
        placeholder={previewSource}
        placeholderContentFit="cover"
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={normalizedUri}
        transition={{ duration: IMAGE_CROSSFADE_MS, effect: "cross-dissolve" }}
        accessibilityLabel={name}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

function LandmarkCard({ landmark }: { landmark: CountryLandmark }) {
  return (
    <View style={styles.card}>
      <View style={styles.imageFrame}>
        <LandmarkImage imageUrl={landmark.imageUrl} name={landmark.name} />
        <View style={styles.nameOverlay}>
          <Text style={styles.name} numberOfLines={2}>
            {landmark.name}
          </Text>
        </View>
      </View>
      <Text style={styles.description}>
        {formatLandmarkDescription(landmark.description)}
      </Text>
    </View>
  );
}

type CountryLandmarksSectionProps = {
  landmarks: CountryLandmark[];
};

export function CountryLandmarksSection({
  landmarks,
}: CountryLandmarksSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const landmarkKey = landmarks.map((landmark) => landmark.id).join("|");

  useEffect(() => {
    setExpanded(false);
  }, [landmarkKey]);

  if (landmarks.length === 0) return null;

  const hasMore = landmarks.length > 1;
  const visibleLandmarks = expanded ? landmarks : landmarks.slice(0, 1);
  const hiddenCount = landmarks.length - 1;

  return (
    <ProfileSection title="Landmarks">
      <View style={styles.list}>
        {visibleLandmarks.map((landmark) => (
          <LandmarkCard key={landmark.id} landmark={landmark} />
        ))}
      </View>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? "Show fewer landmarks"
              : `Show ${hiddenCount} more landmarks`
          }
          onPress={() => setExpanded((value) => !value)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleText}>
            {expanded
              ? "Show less"
              : `Show ${hiddenCount} more landmark${hiddenCount === 1 ? "" : "s"}`}
          </Text>
        </Pressable>
      ) : null}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  card: {
    gap: 8,
  },
  imageFrame: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
  },
  imageStack: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  nameOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  name: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  description: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  },
  toggleRow: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  toggleText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
});
