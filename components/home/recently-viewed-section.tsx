import { Image } from "expo-image";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatRelativeTime } from "@/lib/format-relative-time";
import { getCountryImages } from "@/lib/format-country";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import type { RecentlyViewedEntry } from "@/store/use-recently-viewed-store";

type RecentlyViewedSectionProps = {
  entries: RecentlyViewedEntry[];
};

const CARD_WIDTH = 120;
const CARD_HEIGHT = 96;

export function RecentlyViewedSection({ entries }: RecentlyViewedSectionProps) {
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-lg text-white">
          Recently Viewed
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all recently viewed"
          onPress={() => {}}
        >
          <Text className="font-semibold text-sm text-tab-active">
            See All &gt;
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {entries.map((entry) => (
          <RecentlyViewedCard key={entry.country.name} entry={entry} />
        ))}
      </ScrollView>
    </View>
  );
}

function RecentlyViewedCard({ entry }: { entry: RecentlyViewedEntry }) {
  const { country, viewedAt } = entry;
  const images = getCountryImages(country);
  const heroUri = images[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Recently viewed ${country.name}`}
      onPress={() => openCountryInExplore(country)}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {heroUri ? (
        <Image
          source={{ uri: heroUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={StyleSheet.absoluteFill} className="bg-midnight-navy" />
      )}
      <View style={styles.overlay} />
      <View className="flex-1 justify-end p-2">
        <Text className="font-semibold text-sm text-white" numberOfLines={1}>
          {country.name}
        </Text>
        <Text className="text-[10px] text-white/60">
          {formatRelativeTime(viewedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
});
