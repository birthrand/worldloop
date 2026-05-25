import { Image } from "expo-image";
import { Text, View } from "react-native";

import { images } from "@/constants/images";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-8">
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
    </View>
  );
}
