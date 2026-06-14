import { Entypo } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";
import AnimatedReanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryHeroCarousel } from "@/components/ai-explorer/country-hero-carousel";
import {
  CountryHeroTopScrim,
  getCountryHeroTopScrimHeight,
} from "@/components/ai-explorer/country-hero-scrims";
import { CountryLandmarksSection } from "@/components/ai-explorer/country-landmarks-section";
import { CountryLocationMap } from "@/components/ai-explorer/country-location-map";
import { Divider } from "@/components/ai-explorer/divider";
import { ProfileSection } from "@/components/ai-explorer/profile-section";
import { StatItem } from "@/components/ai-explorer/stat-item";
import { CultureVideoSlide } from "@/components/culture/culture-video-slide";
import type { HeroMediaMode } from "@/components/explore/explore-swipe-card";
import { FlagBadge } from "@/components/explore/flag-badge";
import {
  COUNTRY_DETAIL_MODULE_BG,
  COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE,
  getCountryDetailContentGap,
  getCountryDetailContentOverlap,
  getCountryDetailContentPaddingBottom,
  getCountryDetailContentPaddingTop,
  getCountryDetailHeroHeight,
  getCountryDetailProfileSectionsOffset,
  getCountryDetailTitleCollapseThreshold,
} from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_PRESS_OVERLAY,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_HEADER_ICON_COLOR,
  EXPLORE_SWIPE_SCREEN_BG,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import {
  formatArea,
  formatClimateZone,
  formatCoordinates,
  formatCountryCode,
  formatHemisphere,
  formatLandlocked,
  formatOfficialLanguages,
  formatPopulation,
  formatPrimaryTimezone,
  formatSubregion,
  getCultureVideo,
  getProfileAiFacts,
  hasCultureVideo,
} from "@/lib/format-country";
import type { Country } from "@/types/country";

const DESCRIPTION_COLLAPSED_LINES = 3;
const DESCRIPTION_READ_MORE_CHAR_THRESHOLD = 200;
const OVERVIEW_LINE_HEIGHT = 22;
const OVERVIEW_PARAGRAPH_GAP = 12;
const OVERVIEW_PARAGRAPH_SENTENCES = 2;
const OVERVIEW_SKELETON_LINE_WIDTHS = ["100%", "94%", "78%"] as const;
const COUNTRY_NAME_FONT_SIZE = EXPLORE_SWIPE_TEXT_HEADER;
const COUNTRY_NAME_MIN_FONT_SIZE = 15;
const COUNTRY_NAME_LINE_HEIGHT = EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT;
const MEDIA_CHIP_ICON_SIZE = 22;
const MEDIA_CHIP_GLYPH_SIZE = 13;
const HERO_MEDIA_FADE_MS = 220;

function buildOverviewPreview(
  lines: TextLayoutEventData["lines"],
  maxLines: number,
): { overflows: boolean; preview: string } {
  if (lines.length <= maxLines) {
    return { overflows: false, preview: "" };
  }

  const truncated = lines
    .slice(0, maxLines)
    .map((line) => line.text)
    .join(" ")
    .trim()
    .replace(/\s+/g, " ");
  const lastSpace = truncated.lastIndexOf(" ");
  const preview =
    lastSpace > 0 ? truncated.slice(0, lastSpace).trimEnd() : truncated;

  return { overflows: true, preview };
}

function splitOverviewIntoParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const explicitParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph.replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
    )
    .filter(Boolean);

  if (explicitParagraphs.length > 1) {
    return explicitParagraphs;
  }

  const block = explicitParagraphs[0] ?? normalized.replace(/\s+/g, " ").trim();
  const sentences = block
    .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [block];

  if (sentences.length <= OVERVIEW_PARAGRAPH_SENTENCES) {
    return [block];
  }

  const paragraphs: string[] = [];
  for (
    let index = 0;
    index < sentences.length;
    index += OVERVIEW_PARAGRAPH_SENTENCES
  ) {
    paragraphs.push(
      sentences.slice(index, index + OVERVIEW_PARAGRAPH_SENTENCES).join(" "),
    );
  }

  return paragraphs;
}

type CountryProfileCardProps = {
  country: Country;
  images: string[];
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
  overviewLoading?: boolean;
  scrollY: SharedValue<number>;
  onShowMap: () => void;
  initialHeroIndex?: number;
  initialHeroMediaMode?: HeroMediaMode;
};

function SectionDivider() {
  return <Divider style={styles.sectionDivider} />;
}

function OverviewTextSkeleton({
  lines = DESCRIPTION_COLLAPSED_LINES,
}: {
  lines?: number;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View
      style={[
        styles.overviewSkeleton,
        { minHeight: lines * OVERVIEW_LINE_HEIGHT },
      ]}
      accessibilityLabel="Loading overview"
    >
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={`overview-skeleton-line-${index}`}
          style={styles.overviewSkeletonLine}
        >
          <Animated.View
            style={[
              styles.overviewSkeletonBar,
              {
                width: OVERVIEW_SKELETON_LINE_WIDTHS[index] ?? "64%",
                opacity: pulse,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function QuickStatsGrid({
  population,
  capital,
  region,
  language,
}: {
  population: string;
  capital: string;
  region: string;
  language: string;
}) {
  return (
    <View style={styles.statsPanel}>
      <View style={styles.statsRow}>
        <StatItem tile align="start" label="Population" value={population} />
        <Divider vertical />
        <StatItem tile align="start" label="Capital" value={capital} />
      </View>
      <Divider />
      <View style={styles.statsRow}>
        <StatItem tile align="start" label="Region" value={region} />
        <Divider vertical />
        <StatItem tile align="start" label="Language" value={language} />
      </View>
    </View>
  );
}

type GeographyFacts = {
  coordinates: string;
  subregion: string;
  area: string;
  landlocked: string;
  timezone: string;
  hemisphere: string;
  climate: string;
  countryCode: string;
};

function GeographyGrid({ facts }: { facts: GeographyFacts }) {
  return (
    <View style={styles.statsPanel}>
      <View style={styles.statsRow}>
        <StatItem
          tile
          align="start"
          label="Coordinates"
          value={facts.coordinates}
        />
        <Divider vertical />
        <StatItem
          tile
          align="start"
          label="Subregion"
          value={facts.subregion}
        />
      </View>
      <Divider />
      <View style={styles.statsRow}>
        <StatItem tile align="start" label="Area" value={facts.area} />
        <Divider vertical />
        <StatItem
          tile
          align="start"
          label="Landlocked"
          value={facts.landlocked}
        />
      </View>
      <Divider />
      <View style={styles.statsRow}>
        <StatItem tile align="start" label="Time zone" value={facts.timezone} />
        <Divider vertical />
        <StatItem
          tile
          align="start"
          label="Hemisphere"
          value={facts.hemisphere}
        />
      </View>
      <Divider />
      <View style={styles.statsRow}>
        <StatItem tile align="start" label="Climate" value={facts.climate} />
        <Divider vertical />
        <StatItem
          tile
          align="start"
          label="Country code"
          value={facts.countryCode}
        />
      </View>
    </View>
  );
}

export function CountryProfileCard({
  country,
  images,
  wikipedia,
  landmarks,
  overviewLoading = false,
  scrollY,
  onShowMap,
  initialHeroIndex = 0,
  initialHeroMediaMode = "image",
}: CountryProfileCardProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroHeight = getCountryDetailHeroHeight(screenHeight);
  const cultureVideo = useMemo(() => getCultureVideo(country), [country]);
  const canShowCulture = hasCultureVideo(country);
  const [heroMediaMode, setHeroMediaMode] = useState<HeroMediaMode>(() =>
    initialHeroMediaMode === "video" && canShowCulture ? "video" : "image",
  );
  const heroImageOpacity = useSharedValue(
    initialHeroMediaMode === "video" && canShowCulture ? 0 : 1,
  );
  const heroVideoOpacity = useSharedValue(
    initialHeroMediaMode === "video" && canShowCulture ? 1 : 0,
  );

  useEffect(() => {
    const nextMode =
      initialHeroMediaMode === "video" && canShowCulture ? "video" : "image";
    setHeroMediaMode(nextMode);
    heroImageOpacity.value = nextMode === "image" ? 1 : 0;
    heroVideoOpacity.value = nextMode === "video" ? 1 : 0;
  }, [
    canShowCulture,
    country.name,
    heroImageOpacity,
    heroVideoOpacity,
    initialHeroMediaMode,
  ]);

  useEffect(() => {
    if (heroMediaMode === "video" && !canShowCulture) {
      setHeroMediaMode("image");
    }
  }, [canShowCulture, heroMediaMode]);

  useEffect(() => {
    const showImage = heroMediaMode === "image";
    heroImageOpacity.value = withTiming(showImage ? 1 : 0, {
      duration: HERO_MEDIA_FADE_MS,
    });
    heroVideoOpacity.value = withTiming(showImage ? 0 : 1, {
      duration: HERO_MEDIA_FADE_MS,
    });
  }, [heroMediaMode, heroImageOpacity, heroVideoOpacity]);

  const heroImageLayerStyle = useAnimatedStyle(() => ({
    opacity: heroImageOpacity.value,
  }));

  const heroVideoLayerStyle = useAnimatedStyle(() => ({
    opacity: heroVideoOpacity.value,
  }));

  const handleToggleCulture = () => {
    if (!canShowCulture) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHeroMediaMode((mode) => (mode === "video" ? "image" : "video"));
  };

  const cultureAccessibilityLabel =
    heroMediaMode === "video"
      ? `Show photos for ${country.name}`
      : canShowCulture
        ? `Watch culture video for ${country.name}`
        : `No culture video for ${country.name}`;

  const contentOverlap = getCountryDetailContentOverlap(screenHeight);
  const videoHeroHeight = heroHeight - contentOverlap;
  const contentPaddingTop = getCountryDetailContentPaddingTop(screenHeight);
  const contentGap = getCountryDetailContentGap(screenHeight);
  const contentPaddingBottom =
    getCountryDetailContentPaddingBottom(screenHeight);
  const profileSectionsOffset =
    getCountryDetailProfileSectionsOffset(screenHeight);
  const collapseThreshold = getCountryDetailTitleCollapseThreshold(
    screenHeight,
    insets.top,
  );
  const fadeStart = Math.max(
    0,
    collapseThreshold - COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE,
  );

  const contentTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [overviewOverflows, setOverviewOverflows] = useState(false);

  useEffect(() => {
    setOverviewExpanded(false);
    setOverviewOverflows(false);
  }, [wikipedia?.extract]);

  const regionLabel = continentDisplayLabel(country.region);
  const languagesLabel = formatOfficialLanguages(country.languages);
  const geographyFacts = useMemo(
    () => ({
      coordinates: formatCoordinates(country.latlng),
      subregion: formatSubregion(country.subregion),
      area: formatArea(country.area),
      landlocked: formatLandlocked(country.landlocked),
      timezone: formatPrimaryTimezone(country.timezones),
      hemisphere: formatHemisphere(country.latlng),
      climate: formatClimateZone(country.latlng),
      countryCode: formatCountryCode(country.cca2),
    }),
    [country],
  );
  const aiFacts = useMemo(() => getProfileAiFacts(country), [country]);
  const featuredFact = aiFacts[0];

  const wikipediaExtract = wikipedia?.extract?.trim() ?? "";
  const overviewText =
    wikipediaExtract ||
    (overviewLoading
      ? ""
      : country.ai?.caption?.trim() ||
        country.ai?.fact?.trim() ||
        `Explore ${country.name} — discover its people, places, and stories.`);

  const overviewParagraphs = useMemo(
    () => splitOverviewIntoParagraphs(overviewText),
    [overviewText],
  );

  const handleOverviewMeasure = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    const { overflows } = buildOverviewPreview(
      event.nativeEvent.lines,
      DESCRIPTION_COLLAPSED_LINES,
    );
    setOverviewOverflows(overflows);
  };

  const showReadMoreControl =
    overviewOverflows ||
    overviewExpanded ||
    overviewText.length > DESCRIPTION_READ_MORE_CHAR_THRESHOLD;

  const openWikipedia = () => {
    if (wikipedia?.pageUrl) {
      void WebBrowser.openBrowserAsync(wikipedia.pageUrl);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.heroWrap, { height: heroHeight }]}>
        <AnimatedReanimated.View
          style={[
            styles.heroImageLayer,
            { height: heroHeight },
            heroImageLayerStyle,
          ]}
          pointerEvents={heroMediaMode === "image" ? "auto" : "none"}
        >
          <CountryHeroCarousel
            images={images}
            countryName={country.name}
            initialIndex={initialHeroIndex}
          />
        </AnimatedReanimated.View>

        {cultureVideo ? (
          <AnimatedReanimated.View
            style={[
              styles.heroVideoLayer,
              { width: screenWidth, height: videoHeroHeight },
              heroVideoLayerStyle,
            ]}
            pointerEvents={heroMediaMode === "video" ? "auto" : "none"}
          >
            <CultureVideoSlide
              video={cultureVideo}
              isActive={heroMediaMode === "video"}
              width={screenWidth}
              height={videoHeroHeight}
              flag={country.flag}
              iso2={country.cca2}
              contentPosition="top"
            />
            <CountryHeroTopScrim
              height={getCountryHeroTopScrimHeight(videoHeroHeight)}
            />
          </AnimatedReanimated.View>
        ) : null}
      </View>

      <AnimatedReanimated.View
        style={[
          styles.content,
          {
            marginTop: -contentOverlap,
            paddingTop: contentPaddingTop,
            paddingBottom: contentPaddingBottom,
            gap: contentGap,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleMeasureWrap}>
            <AnimatedReanimated.Text
              style={[styles.countryName, contentTitleStyle]}
              numberOfLines={2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={
                COUNTRY_NAME_MIN_FONT_SIZE / COUNTRY_NAME_FONT_SIZE
              }
            >
              {country.name}
            </AnimatedReanimated.Text>
          </View>
          <View style={styles.mediaChips}>
            <View style={styles.mediaChip}>
              <FlagBadge
                flag={country.flag}
                iso2={country.cca2}
                width={22}
                height={22}
                circular
              />
              <Text style={styles.mediaChipLabel}>FLAG</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cultureAccessibilityLabel}
              accessibilityHint={
                canShowCulture
                  ? "Toggles between photos and a culture video in the hero"
                  : "This country does not have a culture video yet"
              }
              accessibilityState={{
                disabled: !canShowCulture,
                selected: heroMediaMode === "video",
              }}
              disabled={!canShowCulture}
              onPress={handleToggleCulture}
              style={({ pressed }) => [
                styles.mediaChip,
                heroMediaMode === "video" && styles.mediaChipActive,
                !canShowCulture && styles.mediaChipDisabled,
                pressed && canShowCulture && styles.mediaChipPressed,
              ]}
            >
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.mediaChipIconFrame,
                      heroMediaMode === "video" &&
                        styles.mediaChipIconFrameActive,
                      !canShowCulture && styles.mediaChipIconFrameDisabled,
                      pressed &&
                        canShowCulture &&
                        styles.mediaChipIconFramePressed,
                    ]}
                  >
                    <Entypo
                      name={
                        heroMediaMode === "video" ? "video" : "image-inverted"
                      }
                      size={MEDIA_CHIP_GLYPH_SIZE}
                      color={
                        !canShowCulture
                          ? "rgba(255, 255, 255, 0.35)"
                          : heroMediaMode === "video"
                            ? EXPLORE_SWIPE_ACCENT_COLOR
                            : EXPLORE_SWIPE_HEADER_ICON_COLOR
                      }
                    />
                    {pressed && canShowCulture ? (
                      <View style={styles.mediaChipIconPressOverlay} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.mediaChipLabel,
                      heroMediaMode === "video" && styles.mediaChipLabelActive,
                      !canShowCulture && styles.mediaChipLabelDisabled,
                      pressed && canShowCulture && styles.mediaChipLabelPressed,
                    ]}
                  >
                    {heroMediaMode === "video" ? "VIDEO" : "IMAGE"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <QuickStatsGrid
          population={formatPopulation(country.population)}
          capital={country.capital}
          region={regionLabel}
          language={languagesLabel}
        />

        <View
          style={[styles.profileSections, { marginTop: profileSectionsOffset }]}
        >
          <SectionDivider />
          <ProfileSection title="Location">
            <CountryLocationMap country={country} onPress={onShowMap} />
          </ProfileSection>

          <SectionDivider />
          <ProfileSection title="Overview">
            <View style={styles.overviewModule}>
              {overviewLoading && !wikipediaExtract ? (
                <OverviewTextSkeleton />
              ) : (
                <>
                  <View style={styles.overviewBody}>
                    <Text
                      key={overviewText}
                      style={styles.overviewMeasure}
                      onTextLayout={handleOverviewMeasure}
                    >
                      {overviewText}
                    </Text>
                    {overviewExpanded ? (
                      <View style={styles.overviewParagraphs}>
                        {overviewParagraphs.map((paragraph, index) => (
                          <Text
                            key={`overview-paragraph-${index}`}
                            style={[
                              styles.bodyText,
                              index > 0 ? styles.overviewParagraph : null,
                            ]}
                          >
                            {paragraph}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text
                        style={styles.bodyText}
                        numberOfLines={DESCRIPTION_COLLAPSED_LINES}
                      >
                        {overviewText}
                      </Text>
                    )}
                  </View>
                  {showReadMoreControl ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        overviewExpanded ? "Read less" : "Read more"
                      }
                      onPress={() => setOverviewExpanded((value) => !value)}
                      style={styles.readMoreRow}
                    >
                      <Text style={styles.readMoreText}>
                        {overviewExpanded ? "Read less" : "Read more"}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          </ProfileSection>

          {featuredFact ? (
            <>
              <SectionDivider />
              <ProfileSection title="Did you know?">
                <View style={styles.factCallout}>
                  <Text style={styles.factCalloutText}>{featuredFact}</Text>
                </View>
              </ProfileSection>
            </>
          ) : null}

          {landmarks.length > 0 ? (
            <>
              <SectionDivider />
              <CountryLandmarksSection landmarks={landmarks} />
            </>
          ) : null}

          <SectionDivider />
          <ProfileSection title="Geography">
            <GeographyGrid facts={geographyFacts} />
          </ProfileSection>

          {wikipedia?.pageUrl ? (
            <>
              <SectionDivider />
              <ProfileSection title="Learn more">
                <Text style={styles.bodyText}>
                  Read the full article on Wikipedia for history, culture, and
                  more detail about {country.name}.
                </Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open Wikipedia article"
                  onPress={openWikipedia}
                  style={styles.wikipediaButton}
                >
                  <Text style={styles.linkText}>Open on Wikipedia</Text>
                </Pressable>
              </ProfileSection>
            </>
          ) : null}
        </View>
      </AnimatedReanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  heroWrap: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  heroImageLayer: {
    width: "100%",
  },
  heroVideoLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    overflow: "hidden",
  },
  titleMeasureWrap: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    marginHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_SCREEN_BG,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  countryName: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: "Poppins-SemiBold",
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: COUNTRY_NAME_LINE_HEIGHT,
    letterSpacing: -0.2,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  mediaChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  mediaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    overflow: "hidden",
  },
  mediaChipActive: {
    borderColor: "rgba(251, 191, 36, 0.45)",
  },
  mediaChipDisabled: {
    opacity: 0.72,
  },
  mediaChipPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  mediaChipLabel: {
    flexShrink: 1,
    fontFamily: "Poppins-Medium",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  mediaChipLabelActive: {
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
  mediaChipLabelDisabled: {
    color: "rgba(255, 255, 255, 0.35)",
  },
  mediaChipLabelPressed: {
    opacity: 0.9,
  },
  mediaChipIconFrame: {
    width: MEDIA_CHIP_ICON_SIZE,
    height: MEDIA_CHIP_ICON_SIZE,
    borderRadius: MEDIA_CHIP_ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  mediaChipIconFramePressed: {
    borderColor: "rgba(255, 255, 255, 0.34)",
  },
  mediaChipIconPressOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: MEDIA_CHIP_ICON_SIZE / 2,
    backgroundColor: EXPLORE_SWIPE_CARD_PRESS_OVERLAY,
  },
  mediaChipIconFrameActive: {
    borderColor: "rgba(251, 191, 36, 0.45)",
  },
  mediaChipIconFrameDisabled: {
    opacity: 0.72,
  },
  statsPanel: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  sectionDivider: {
    marginVertical: 0,
  },
  profileSections: {
    gap: 8,
  },
  overviewModule: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  overviewSkeleton: {
    width: "100%",
  },
  overviewSkeletonLine: {
    height: OVERVIEW_LINE_HEIGHT,
    justifyContent: "center",
  },
  overviewSkeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  overviewBody: {
    width: "100%",
  },
  overviewParagraphs: {
    width: "100%",
  },
  overviewParagraph: {
    marginTop: OVERVIEW_PARAGRAPH_GAP,
  },
  overviewMeasure: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
    pointerEvents: "none",
  },
  bodyText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  },
  readMoreRow: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  readMoreText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
  linkText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
  factCallout: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  factCalloutText: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  },
  wikipediaButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
});
