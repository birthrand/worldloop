import { Image } from "expo-image";
import { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { images } from "@/constants/images";
import { clearAllClientCache } from "@/lib/client-cache";
import { useCountryFeedStore, useSavedCountriesStore } from "@/store";

function DevButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="rounded-lg bg-ocean-blue px-3 py-2"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text className="text-center text-sm font-medium text-white">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DevScreen() {
  const countries = useCountryFeedStore((s) => s.countries);
  const nextCursor = useCountryFeedStore((s) => s.nextCursor);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);
  const loadMoreFeed = useCountryFeedStore((s) => s.loadMoreFeed);
  const clearSaved = useSavedCountriesStore((s) => s.clearSaved);
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const savedCount = useSavedCountriesStore((s) => s.savedCountries.length);

  const currentCountry = countries[currentIndex];
  const isFeedLoading = status === "loading" || status === "loadingMore";

  useEffect(() => {
    void loadInitialFeed();
  }, [loadInitialFeed]);

  const handleToggleSaved = () => {
    if (currentCountry) toggleSaved(currentCountry);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="grow items-center justify-center gap-6 px-8 py-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Image
        source={images.worldloopIcon}
        style={{ width: 80, height: 80 }}
        contentFit="contain"
      />
      <View className="items-center gap-2">
        <Text className="h1 text-midnight-navy">WorldLoop</Text>
        <Text className="brand__tagline">EXPLORE. CONNECT. BELONG.</Text>
      </View>
      <View className="w-full gap-3 rounded-2xl border border-border bg-surface p-5">
        <Text className="h3">Design system ready</Text>
        <Text className="body-md">
          Poppins fonts, WorldLoop colors, and typography utilities are loaded.
        </Text>
        <View className="flex-row gap-2">
          <View className="h-8 flex-1 rounded-lg bg-ocean-blue" />
          <View className="h-8 flex-1 rounded-lg bg-teal-cyan" />
          <View className="h-8 flex-1 rounded-lg bg-aurora-purple" />
        </View>
      </View>

      <View className="w-full gap-3 rounded-2xl border border-dashed border-border bg-surface p-5">
        <Text className="h3">Feed dev (Zustand)</Text>
        <Text className="body-sm text-muted">
          Status: {status}
          {" · "}
          Countries: {countries.length}
          {" · "}
          Index: {currentIndex}
          {" · "}
          Saved: {savedCount}
        </Text>
        <Text className="body-sm text-muted">
          nextCursor: {nextCursor ?? "null"}
        </Text>
        <Text className="body-sm text-muted">
          Current: {currentCountry?.name ?? "—"}
        </Text>
        {error ? <Text className="body-sm text-error">{error}</Text> : null}
        <View className="flex-row flex-wrap gap-2">
          <DevButton
            label="Load feed"
            onPress={() => void loadInitialFeed()}
            disabled={isFeedLoading}
          />
          <DevButton
            label="Load more"
            onPress={() => void loadMoreFeed()}
            disabled={isFeedLoading || nextCursor === null}
          />
          <DevButton label="Toggle saved" onPress={handleToggleSaved} />
          <DevButton label="Clear saved" onPress={clearSaved} />
          <DevButton
            label="Clear local cache"
            onPress={() => void clearAllClientCache()}
          />
        </View>
      </View>
    </ScrollView>
  );
}
