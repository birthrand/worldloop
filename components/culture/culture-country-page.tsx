import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { CultureOverlay } from "@/components/culture/culture-overlay";
import { CultureVideoSlide } from "@/components/culture/culture-video-slide";
import { CountryImage } from "@/components/explore/country-image";
import { getCulturePosterUri, getCultureVideo } from "@/lib/format-country";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import type { Country } from "@/types/country";

type CultureCountryPageProps = {
  country: Country;
  pageHeight: number;
  pageWidth: number;
  isActive: boolean;
};

export function CultureCountryPage({
  country,
  pageHeight,
  pageWidth,
  isActive,
}: CultureCountryPageProps) {
  const video = getCultureVideo(country);
  const posterUri = getCulturePosterUri(country);

  useEffect(() => {
    void prefetchCountryProfile(country.name);
  }, [country.name]);

  if (!video) {
    return (
      <View style={{ width: pageWidth, height: pageHeight }}>
        <View
          style={[styles.mediaShell, { width: pageWidth, height: pageHeight }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${country.name} culture poster`}
        >
          <CountryImage
            uri={posterUri}
            flag={country.flag}
            iso2={country.cca2}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>
        <CultureOverlay country={country} />
      </View>
    );
  }

  return (
    <View style={{ width: pageWidth, height: pageHeight }}>
      <CultureVideoSlide
        video={video}
        flag={country.flag}
        iso2={country.cca2}
        posterUri={posterUri}
        isActive={isActive}
        width={pageWidth}
        height={pageHeight}
      />
      <CultureOverlay country={country} />
    </View>
  );
}

const styles = StyleSheet.create({
  mediaShell: {
    overflow: "hidden",
    backgroundColor: "#0b132b",
  },
});
