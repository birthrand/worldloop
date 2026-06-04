import { useMemo, useState } from "react";
import {
  Linking,
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

const DESCRIPTION_COLLAPSED_LINES = 5;

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

  const overviewText =
    wikipedia?.extract?.trim() ||
    country.ai?.caption?.trim() ||
    country.ai?.fact?.trim() ||
    `Explore ${country.name} — discover its people, places, and stories.`;

  const handleOverviewMeasure = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    setOverviewOverflows(
      event.nativeEvent.lines.length > DESCRIPTION_COLLAPSED_LINES,
    );
  };

  const openWikipedia = () => {
    if (wikipedia?.pageUrl) {
      void Linking.openURL(wikipedia.pageUrl);
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
        <Text style={styles.countryName} numberOfLines={2}>
          {country.name}
        </Text>

        <SectionDivider />

        <ProfileSection title="Location">
          <CountryLocationMap country={country} onPress={onShowMap} />
        </ProfileSection>

        <SectionDivider />

        <View style={styles.factGrid}>
          <ProfileFactRow
            label="Population"
            value={formatPopulation(country.population)}
          />
          <ProfileFactRow label="Capital" value={country.capital} />
          <ProfileFactRow label="Region" value={regionLabel} />
          <ProfileFactRow label="Language" value={languagesLabel} />
        </View>

        <SectionDivider />

        <ProfileSection title="Overview">
          <View>
            <Text
              style={styles.overviewMeasure}
              onTextLayout={handleOverviewMeasure}
            >
              {overviewText}
            </Text>
            <Text
              style={styles.bodyText}
              numberOfLines={
                overviewExpanded ? undefined : DESCRIPTION_COLLAPSED_LINES
              }
            >
              {overviewText}
            </Text>
          </View>
          {(overviewOverflows || overviewExpanded) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={overviewExpanded ? "See less" : "See more"}
              onPress={() => setOverviewExpanded((value) => !value)}
              style={styles.readMoreRow}
            >
              <Text style={styles.linkText}>
                {overviewExpanded ? "See less" : "See more"}
              </Text>
            </Pressable>
          )}
        </ProfileSection>

        {aiFacts.length > 0 ? (
          <>
            <SectionDivider />
            <ProfileSection title="Did you know?">
              {aiFacts.map((fact, index) => (
                <View key={`fact-${index}`} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bodyText}>{fact}</Text>
                </View>
              ))}
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
          <View style={styles.factGrid}>
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
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    backgroundColor: AI_EXPLORER_THEME.surface,
    zIndex: 1,
    elevation: 2,
  },
  countryName: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    lineHeight: 28,
    color: AI_EXPLORER_THEME.textPrimary,
  },
  sectionDivider: {
    marginVertical: 0,
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    rowGap: 10,
  },
  overviewMeasure: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    pointerEvents: "none",
  },
  bodyText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: AI_EXPLORER_THEME.textSecondary,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bullet: {
    fontFamily: "Poppins-Bold",
    fontSize: 13,
    lineHeight: 20,
    color: AI_EXPLORER_THEME.accent,
    width: 10,
  },
  readMoreRow: {
    alignSelf: "flex-start",
  },
  linkText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: AI_EXPLORER_THEME.accent,
  },
  wikipediaButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
});
