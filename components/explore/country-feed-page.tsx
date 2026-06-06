import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { prefetchCountryImage } from "@/components/explore/country-image";
import { ExploreCountryCard } from "@/components/explore/explore-country-card";
import { HeroImagePager } from "@/components/explore/hero-image-pager";
import { HeroScrims } from "@/components/explore/hero-scrims";
import { getAiFactByIndex, getCountryImages } from "@/lib/format-country";
import {
  openCountryAiExplorer,
  warmCountryAiExplorer,
} from "@/lib/open-country-ai-explorer";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import type { Country } from "@/types/country";

type CountryFeedPageProps = {
  country: Country;
  pageHeight: number;
};

export function CountryFeedPage({ country, pageHeight }: CountryFeedPageProps) {
  const images = useMemo(() => getCountryImages(country), [country.name]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [country.name]);

  useEffect(() => {
    for (const imageUri of images) {
      void prefetchCountryImage(imageUri);
    }
  }, [images]);

  useEffect(() => {
    void prefetchCountryProfile(country.name);
  }, [country.name]);

  const onImageIndexChange = useCallback((index: number) => {
    setHeroIndex(index);
  }, []);

  const warmAiExplorer = useCallback(() => {
    warmCountryAiExplorer(country);
  }, [country]);

  const openAiExplorer = useCallback(() => {
    openCountryAiExplorer(country);
  }, [country]);

  return (
    <View style={{ height: pageHeight, width: "100%" }}>
      <HeroImagePager
        images={images}
        flag={country.flag}
        iso2={country.cca2}
        pageHeight={pageHeight}
        activeIndex={heroIndex}
        onIndexChange={onImageIndexChange}
        onImagePress={openAiExplorer}
        onImagePressIn={warmAiExplorer}
      />

      {/* pageheight here adjusts the height of the scrims to make them darker */}
      <HeroScrims pageHeight={pageHeight / 1.5} />
      <View className="flex-1" pointerEvents="box-none">
        <View className="flex-1 justify-end" pointerEvents="box-none">
          <View className="gap-2">
            <ExploreCountryCard
              country={country}
              fact={getAiFactByIndex(country, heroIndex)}
              imageIndex={heroIndex}
              imageCount={images.length}
              onImageIndexChange={onImageIndexChange}
              onPress={openAiExplorer}
              onPressIn={warmAiExplorer}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
