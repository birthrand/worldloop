import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { formatPopulation } from "@/lib/format-country";
import type { Country } from "@/types/country";

type CountryHeaderProps = {
  country: Country;
};

export function CountryHeader({ country }: CountryHeaderProps) {
  return (
    <View className="px-2">
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="globe-outline"
            size={18}
            color="rgba(255, 255, 255, 0.9)"
          />
          <Text className="font-medium text-base text-white">
            {country.region}
          </Text>
        </View>
        <View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="people-outline" size={18} color="#ffffff" />
            <Text className="font-medium text-base text-white">
              {formatPopulation(country.population)}
            </Text>
          </View>
          <Text className="pl-7 text-xs text-white/70">Population</Text>
        </View>

        <View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location-outline" size={18} color="#ffffff" />
            <Text className="font-medium text-base text-white">
              {country.capital}
            </Text>
          </View>
          <Text className="pl-7 text-xs text-white/70">Capital City</Text>
        </View>
      </View>
    </View>
  );
}
