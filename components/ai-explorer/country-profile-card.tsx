import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";

import { CountryHeroCarousel } from "@/components/ai-explorer/country-hero-carousel";
import { CountryLandmarksSection } from "@/components/ai-explorer/country-landmarks-section";
import { CountryLocationMap } from "@/components/ai-explorer/country-location-map";
import { Divider } from "@/components/ai-explorer/divider";
import {
  ProfileFactRow,
  ProfileSection,
} from "@/components/ai-explorer/profile-section";
import { StatItem } from "@/components/ai-explorer/stat-item";
import { FlagBadge } from "@/components/explore/flag-badge";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
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
  getProfileAiFacts,
} from "@/lib/format-country";
import type { Country } from "@/types/country";

const DESCRIPTION_COLLAPSED_LINES = 3;
const COUNTRY_NAME_FONT_SIZE = 19;
const COUNTRY_NAME_MIN_FONT_SIZE = 15;
const COUNTRY_NAME_LINE_HEIGHT = 24;

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
    .join("")
    .trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  const preview =
    lastSpace > 0 ? truncated.slice(0, lastSpace).trimEnd() : truncated;

  return { overflows: true, preview };
}

type CountryProfileCardProps = {
  country: Country;
  images: string[];
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
  onBack: () => void;
  onShowMap: () => void;
};

function SectionDivider() {
  return <Divider style={styles.sectionDivider} />;
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

export function CountryProfileCard({
  country,
  images,
  wikipedia,
  landmarks,
  onBack,
  onShowMap,
}: CountryProfileCardProps) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [overviewOverflows, setOverviewOverflows] = useState(false);
  const [overviewPreview, setOverviewPreview] = useState("");

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

  const overviewText =
    wikipedia?.extract?.trim() ||
    country.ai?.caption?.trim() ||
    country.ai?.fact?.trim() ||
    `Explore ${country.name} — discover its people, places, and stories.`;

  const handleOverviewMeasure = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    const { overflows, preview } = buildOverviewPreview(
      event.nativeEvent.lines,
      DESCRIPTION_COLLAPSED_LINES,
    );
    setOverviewOverflows(overflows);
    setOverviewPreview(preview);
  };

  const displayOverview =
    overviewExpanded || !overviewOverflows
      ? overviewText
      : overviewPreview || overviewText;

  const openWikipedia = () => {
    if (wikipedia?.pageUrl) {
      void WebBrowser.openBrowserAsync(wikipedia.pageUrl);
    }
  };

  return (
    <View style={styles.root}>
      <CountryHeroCarousel
        images={images}
        countryName={country.name}
        onBack={onBack}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={styles.countryName}
            numberOfLines={2}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={
              COUNTRY_NAME_MIN_FONT_SIZE / COUNTRY_NAME_FONT_SIZE
            }
          >
            {country.name}
          </Text>
          <View style={styles.flagChip}>
            <FlagBadge
              flag={country.flag}
              iso2={country.cca2}
              width={22}
              height={22}
              circular
            />
            <Text style={styles.flagLabel}>FLAG</Text>
          </View>
        </View>

        <QuickStatsGrid
          population={formatPopulation(country.population)}
          capital={country.capital}
          region={regionLabel}
          language={languagesLabel}
        />

        <ProfileSection title="Location">
          <CountryLocationMap country={country} onPress={onShowMap} />
        </ProfileSection>

        <SectionDivider />

        <ProfileSection title="Overview">
          <View>
            <Text
              style={styles.overviewMeasure}
              onTextLayout={handleOverviewMeasure}
            >
              {overviewText}
            </Text>
            <Text style={styles.bodyText}>{displayOverview}</Text>
          </View>
          {(overviewOverflows || overviewExpanded) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={overviewExpanded ? "Read less" : "Read more"}
              onPress={() => setOverviewExpanded((value) => !value)}
              style={styles.readMoreRow}
            >
              <Text style={styles.linkText}>
                {overviewExpanded ? "Read less" : "Read more"}
              </Text>
            </Pressable>
          )}
        </ProfileSection>

        {featuredFact ? (
          <>
            <SectionDivider />
            <View style={styles.factCallout}>
              <Text style={styles.factCalloutLabel}>Did you know?</Text>
              <Text style={styles.factCalloutText}>{featuredFact}</Text>
            </View>
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
          <View style={styles.geographyGrid}>
            <ProfileFactRow
              label="Coordinates"
              value={geographyFacts.coordinates}
            />
            <ProfileFactRow
              label="Subregion"
              value={geographyFacts.subregion}
            />
            <ProfileFactRow label="Area" value={geographyFacts.area} />
            <ProfileFactRow
              label="Landlocked"
              value={geographyFacts.landlocked}
            />
            <ProfileFactRow label="Time zone" value={geographyFacts.timezone} />
            <ProfileFactRow
              label="Hemisphere"
              value={geographyFacts.hemisphere}
            />
            <ProfileFactRow label="Climate" value={geographyFacts.climate} />
            <ProfileFactRow
              label="Country code"
              value={geographyFacts.countryCode}
            />
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  content: {
    marginTop: -36,
    marginHorizontal: 14,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    backgroundColor: AI_EXPLORER_THEME.surface,
    zIndex: 1,
    elevation: 2,
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
    fontFamily: "Poppins-Medium",
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: COUNTRY_NAME_LINE_HEIGHT,
    letterSpacing: -0.2,
    color: AI_EXPLORER_THEME.textPrimary,
  },
  flagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    maxWidth: 120,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: AI_EXPLORER_THEME.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
  },
  flagLabel: {
    flexShrink: 1,
    fontFamily: "Poppins-Medium",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: AI_EXPLORER_THEME.textSecondary,
  },
  statsPanel: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: AI_EXPLORER_THEME.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
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
  geographyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    rowGap: 12,
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
    fontSize: 14,
    lineHeight: 22,
    color: AI_EXPLORER_THEME.textSecondary,
  },
  readMoreRow: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  linkText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: AI_EXPLORER_THEME.accent,
  },
  factCallout: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: AI_EXPLORER_THEME.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
  },
  factCalloutLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: AI_EXPLORER_THEME.textMuted,
  },
  factCalloutText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
    color: AI_EXPLORER_THEME.textSecondary,
  },
  wikipediaButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
});
