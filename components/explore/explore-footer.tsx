import { Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import type { Country } from "@/types/country";

type ExploreFooterProps = {
  country: Country;
};

export function ExploreFooter({ country }: ExploreFooterProps) {
  return (
    <View className="mt-4 flex-row items-center justify-between gap-4 px-2 mb-1">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <FlagBadge
          flag={country.flag}
          iso2={country.cca2}
          width={36}
          height={24}
        />
        <Text
          className="min-w-0 flex-1 font-semibold text-white"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={15 / 18}
          ellipsizeMode="tail"
          style={{ fontSize: 18 }}
        >
          {country.name}
        </Text>
      </View>

      {/* <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Learn more about ${country.name}`}
        onPress={() => {
          Alert.alert("Learn More", `${country.name} — detail screen coming soon.`);
        }}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>Learn More</Text>
        <Ionicons name="arrow-forward" size={18} color="#0b132b" />
      </Pressable> */}
    </View>
  );
}
