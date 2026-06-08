import { Image } from "expo-image";
import { Text, View } from "react-native";

import { images } from "@/constants/images";

export function OnboardingBrandRow() {
  return (
    <View className="flex-row items-center gap-2">
      <Image
        source={images.worldloopIcon}
        style={{ width: 32, height: 32 }}
        contentFit="contain"
      />
      <View>
        <Text className="font-semibold text-lg text-white">WorldLoop</Text>
        <Text className="brand__tagline text-slate-400">
          Explore. Connect. Belong.
        </Text>
      </View>
    </View>
  );
}
