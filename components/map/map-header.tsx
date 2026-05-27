import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { images } from "@/constants/images";

type MapHeaderProps = {
  onGlobePress?: () => void;
};

export function MapHeader({ onGlobePress }: MapHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + 8 }} className="gap-4 px-4">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle 2D and 3D map"
          onPress={onGlobePress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="globe-outline" size={24} color="#ffffff" />
        </Pressable>

        {/* <Image
          source={images.worldloopIcon}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="WorldLoop"
        /> */}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => router.push("/(tabs)/profile")}
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

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  logo: {
    width: 120,
    height: 32,
  },
});
