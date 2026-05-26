import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AiFunFactCard } from "@/components/explore/ai-fun-fact-card";
import { CountryHeader } from "@/components/explore/country-header";
import {
  CountryImage,
  prefetchCountryImage,
} from "@/components/explore/country-image";
import { ExploreActionRail } from "@/components/explore/explore-action-rail";
import { ExploreFooter } from "@/components/explore/explore-footer";
import { ExploreTopBar } from "@/components/explore/explore-top-bar";
import { HeroScrims } from "@/components/explore/hero-scrims";
import { MediaCarousel } from "@/components/explore/media-carousel";
import { getAiFactByIndex, getCountryImages } from "@/lib/format-country";
import type { Country } from "@/types/country";

type CountryFeedPageProps = {
  country: Country;
  pageHeight: number;
};

export function CountryFeedPage({ country, pageHeight }: CountryFeedPageProps) {
  const images = getCountryImages(country);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [country.name]);

  useEffect(() => {
    for (const imageUri of images) {
      prefetchCountryImage(imageUri);
    }
  }, [images]);

  const heroUri = images[heroIndex] ?? images[0];
  const onImageIndexChange = useCallback((index: number) => {
    setHeroIndex(index);
  }, []);

  return (
    <View style={{ height: pageHeight, width: "100%" }}>
      <CountryImage
        uri={heroUri}
        flag={country.flag}
        iso2={country.cca2}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* pageheight here adjusts the height of the scrims to make them darker */}
      <HeroScrims pageHeight={pageHeight / 1.5} />
      <View className="flex-1" pointerEvents="box-none">
        <ExploreTopBar country={country} />

        <View className="flex-1 justify-end" pointerEvents="box-none">
          <View className="px-2">
            <CountryHeader country={country} />
          </View>

          <View className="px-2 pb-4">
            <AiFunFactCard fact={getAiFactByIndex(country, heroIndex)} />
            {/* <ExploreFooter country={country} /> */}

            <MediaCarousel
              key={country.name}
              images={images}
              flag={country.flag}
              iso2={country.cca2}
              onImageIndexChange={onImageIndexChange}
            />

            {/* <DidYouKnowCard body={getDidYouKnowText(country)} /> */}
            <ExploreFooter country={country} />
          </View>
        </View>

        <ExploreActionRail country={country} />
      </View>
    </View>
  );
}
