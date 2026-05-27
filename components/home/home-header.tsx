import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { images } from "@/constants/images";
import { getTimeGreeting } from "@/lib/greeting";

const USER_NAME = "Alex";

type HomeHeaderProps = {
  onAvatarPress?: () => void;
};

export function HomeHeader({ onAvatarPress }: HomeHeaderProps) {
  const greeting = getTimeGreeting();

  return (
    <View className="gap-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-bold text-[22px] leading-tight text-white">
            {greeting}, {USER_NAME} 👋
          </Text>
          <Text className="body-md text-white/55">
            Where will curiosity take you today?
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => {
            if (onAvatarPress) {
              onAvatarPress();
              return;
            }
            router.push("/(tabs)/profile");
          }}
          className="h-11 w-11 overflow-hidden rounded-full border-2 border-tab-active"
        >
          <Image
            source={images.profileAvatar}
            style={{ width: 44, height: 44 }}
            contentFit="cover"
          />
        </Pressable>
      </View>
    </View>
  );
}
