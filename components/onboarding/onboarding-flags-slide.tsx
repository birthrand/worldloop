import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { OnboardingPagination } from "@/components/onboarding/onboarding-pagination";
import { OnboardingSlideContent } from "@/components/onboarding/onboarding-slide-content";
import { ONBOARDING_BOTTOM_FADE_GRADIENT } from "@/constants/onboarding-theme";
import type { OnboardingSlideData } from "@/data/onboarding-slides";

type ScrapPolaroid = {
  id: string;
  name: string;
  flag: string;
  image: string;
  left: `${number}%`;
  top: `${number}%`;
  rotation: number;
  size: "hero" | "medium" | "small";
  zIndex: number;
  note?: string;
};

type FlagSticker = {
  id: string;
  flag: string;
  left: `${number}%`;
  top: `${number}%`;
  rotation: number;
};

const SCRAP_POLAROIDS: ScrapPolaroid[] = [
  {
    id: "japan",
    name: "Japan",
    flag: "🇯🇵",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80",
    left: "24%",
    top: "30%",
    rotation: -3,
    size: "hero",
    zIndex: 5,
    note: "Cherry blossoms peak in late March.",
  },
  {
    id: "brazil",
    name: "Brazil",
    flag: "🇧🇷",
    image:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&q=80",
    left: "2%",
    top: "8%",
    rotation: -14,
    size: "small",
    zIndex: 2,
  },
  {
    id: "iceland",
    name: "Iceland",
    flag: "🇮🇸",
    image:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=600&q=80",
    left: "62%",
    top: "4%",
    rotation: 11,
    size: "medium",
    zIndex: 3,
  },
  {
    id: "france",
    name: "France",
    flag: "🇫🇷",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    left: "4%",
    top: "58%",
    rotation: 9,
    size: "medium",
    zIndex: 4,
  },
  {
    id: "kenya",
    name: "Kenya",
    flag: "🇰🇪",
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80",
    left: "68%",
    top: "54%",
    rotation: -10,
    size: "small",
    zIndex: 2,
  },
  {
    id: "india",
    name: "India",
    flag: "🇮🇳",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&q=80",
    left: "58%",
    top: "72%",
    rotation: 7,
    size: "medium",
    zIndex: 3,
  },
];

const FLAG_STICKERS: FlagSticker[] = [
  { id: "mx", flag: "🇲🇽", left: "78%", top: "34%", rotation: 18 },
  { id: "au", flag: "🇦🇺", left: "12%", top: "38%", rotation: -12 },
  { id: "no", flag: "🇳🇴", left: "44%", top: "10%", rotation: 8 },
  { id: "es", flag: "🇪🇸", left: "36%", top: "78%", rotation: -16 },
];

const POLAROID_WIDTH = {
  hero: 168,
  medium: 118,
  small: 92,
} as const;

const TAPE_COLORS = [
  "rgba(251, 191, 36, 0.62)",
  "rgba(244, 114, 182, 0.45)",
  "rgba(125, 211, 252, 0.5)",
  "rgba(167, 243, 208, 0.5)",
] as const;

function PushPin({ color }: { color: string }) {
  return (
    <View style={styles.pinWrap}>
      <View style={[styles.pinHead, { backgroundColor: color }]} />
      <View style={styles.pinNeedle} />
    </View>
  );
}

function TapeStrip({ color, style }: { color: string; style: object }) {
  return <View style={[styles.tape, { backgroundColor: color }, style]} />;
}

function FlagStickerItem({ flag, left, top, rotation }: FlagSticker) {
  return (
    <View
      style={[
        styles.flagSticker,
        { left, top, transform: [{ rotate: `${rotation}deg` }] },
      ]}
    >
      <Text style={styles.flagStickerEmoji}>{flag}</Text>
    </View>
  );
}

type PolaroidCardProps = ScrapPolaroid;

function PolaroidCard({
  name,
  flag,
  image,
  left,
  top,
  rotation,
  size,
  zIndex,
  note,
}: PolaroidCardProps) {
  const cardWidth = POLAROID_WIDTH[size];
  const imageHeight = size === "hero" ? cardWidth * 0.88 : cardWidth * 0.82;
  const tapeColor = TAPE_COLORS[zIndex % TAPE_COLORS.length];
  const pinColor =
    size === "hero" ? "#F87171" : zIndex % 2 === 0 ? "#FBBF24" : "#60A5FA";

  return (
    <View
      style={[
        styles.polaroidWrap,
        {
          left,
          top,
          width: cardWidth,
          zIndex,
          transform: [{ rotate: `${rotation}deg` }],
        },
      ]}
    >
      <PushPin color={pinColor} />
      <TapeStrip
        color={tapeColor}
        style={
          size === "hero"
            ? styles.tapeHero
            : rotation < 0
              ? styles.tapeLeft
              : styles.tapeRight
        }
      />

      <View style={[styles.polaroid, size === "hero" && styles.polaroidHero]}>
        <Image
          source={{ uri: image }}
          style={[styles.polaroidImage, { height: imageHeight }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        <View style={styles.polaroidCaption}>
          <Text style={styles.polaroidFlag}>{flag}</Text>
          <Text
            style={[
              styles.polaroidName,
              size === "small" && styles.polaroidNameSmall,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {note ? (
            <Text style={styles.polaroidNote} numberOfLines={2}>
              {note}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <Text style={styles.brandName}>WorldLoop</Text>
      <Text style={styles.brandTag}>Swipe. Discover.</Text>
    </View>
  );
}

function ScrapbookCollage({ collageHeight }: { collageHeight: number }) {
  return (
    <View style={[styles.collage, { height: collageHeight }]}>
      {FLAG_STICKERS.map((sticker) => (
        <FlagStickerItem key={sticker.id} {...sticker} />
      ))}

      {SCRAP_POLAROIDS.map((polaroid) => (
        <PolaroidCard key={polaroid.id} {...polaroid} />
      ))}

      <View style={styles.sparkleSticker}>
        <Ionicons name="sparkles" size={14} color="#FBBF24" />
        <Text style={styles.sparkleLabel}>AI notes</Text>
      </View>
    </View>
  );
}

type OnboardingFlagsSlideProps = {
  slide: OnboardingSlideData;
  slideCount: number;
  activeIndex: number;
  bottomInset: number;
  onNext: () => void;
};

export function OnboardingFlagsSlide({
  slide,
  slideCount,
  activeIndex,
  bottomInset,
  onNext,
}: OnboardingFlagsSlideProps) {
  const { width, height } = useWindowDimensions();
  const boardHeight = Math.min(height * 0.48, Math.max(width * 0.92, 340));

  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={["#0B132B", "#16213F", "#0F172A"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.upperContent}>
        <View style={styles.paginationWrap}>
          {slideCount > 1 ? (
            <OnboardingPagination
              count={slideCount}
              activeIndex={activeIndex}
            />
          ) : null}
        </View>

        <BrandHeader />

        <View style={styles.heroZone}>
          <ScrapbookCollage collageHeight={boardHeight} />
        </View>
      </View>

      <OnboardingSlideContent
        slide={slide}
        onPress={onNext}
        bottomInset={bottomInset}
        hideSubheadline
      />

      <LinearGradient
        colors={[...ONBOARDING_BOTTOM_FADE_GRADIENT.colors]}
        locations={[...ONBOARDING_BOTTOM_FADE_GRADIENT.locations]}
        pointerEvents="none"
        style={styles.bottomFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#0B132B",
  },
  upperContent: {
    flex: 1,
    justifyContent: "flex-start",
    overflow: "visible",
  },
  paginationWrap: {
    alignItems: "center",
    paddingTop: 12,
    zIndex: 2,
  },
  brandHeader: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 20,
    paddingHorizontal: 24,
    gap: 4,
  },
  brandName: {
    color: "#FFFFFF",
    fontFamily: "Poppins-Bold",
    fontSize: 28,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  brandTag: {
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  heroZone: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 4,
    overflow: "visible",
  },
  collage: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    overflow: "visible",
    backgroundColor: "transparent",
  },
  polaroidWrap: {
    position: "absolute",
  },
  pinWrap: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    left: "42%",
    zIndex: 2,
    alignItems: "center",
  },
  pinHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
  },
  pinNeedle: {
    width: 2,
    height: 5,
    backgroundColor: "rgba(148, 163, 184, 0.8)",
    marginTop: -1,
  },
  tape: {
    position: "absolute",
    height: 16,
    borderRadius: 2,
    zIndex: 3,
    opacity: 0.9,
  },
  tapeHero: {
    top: 10,
    left: "18%",
    width: 52,
    transform: [{ rotate: "-6deg" }],
  },
  tapeLeft: {
    top: 8,
    left: -8,
    width: 38,
    transform: [{ rotate: "-18deg" }],
  },
  tapeRight: {
    top: 10,
    right: -6,
    width: 34,
    transform: [{ rotate: "14deg" }],
  },
  polaroid: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  polaroidHero: {
    paddingBottom: 28,
  },
  polaroidImage: {
    width: "100%",
    backgroundColor: "#E2E8F0",
  },
  polaroidCaption: {
    marginTop: 8,
    gap: 2,
  },
  polaroidFlag: {
    fontSize: 14,
  },
  polaroidName: {
    color: "#1E293B",
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
  },
  polaroidNameSmall: {
    fontSize: 11,
  },
  polaroidNote: {
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  flagSticker: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  flagStickerEmoji: {
    fontSize: 16,
  },
  sparkleSticker: {
    position: "absolute",
    right: 14,
    top: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    transform: [{ rotate: "8deg" }],
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.28)",
  },
  sparkleLabel: {
    color: "#FBBF24",
    fontFamily: "Poppins-Medium",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    zIndex: -1,
  },
});
