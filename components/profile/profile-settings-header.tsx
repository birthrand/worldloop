import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { images } from "@/constants/images";
import {
  PROFILE_EDIT_BADGE_BG,
  PROFILE_EDIT_BADGE_ICON,
} from "@/constants/profile-theme";

const DEFAULT_LOCATION = "San Francisco, USA";

export function ProfileSettingsHeader() {
  const { user } = useUser();

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "Traveler";

  const email =
    user?.primaryEmailAddress?.emailAddress ?? "alex.morgan@example.com";

  const location =
    typeof user?.unsafeMetadata?.location === "string" &&
    user.unsafeMetadata.location
      ? user.unsafeMetadata.location
      : DEFAULT_LOCATION;

  const avatarUri = user?.imageUrl ?? null;

  return (
    <View style={styles.root}>
      <View style={styles.avatarWrap}>
        <Image
          source={avatarUri ? { uri: avatarUri } : images.profileAvatar}
          style={styles.avatar}
          contentFit="cover"
          accessibilityLabel="Profile photo"
        />
        <View style={styles.editBadge}>
          <Ionicons name="pencil" size={12} color={PROFILE_EDIT_BADGE_ICON} />
        </View>
      </View>

      <View style={styles.info}>
        <Text className="font-bold text-[22px] text-white">{displayName}</Text>
        <Text className="mt-1 text-sm text-white/55">{email}</Text>
        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color="rgba(255,255,255,0.55)"
          />
          <Text className="text-sm text-white/55">{location}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarWrap: {
    width: 68,
    height: 68,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_EDIT_BADGE_BG,
    borderWidth: 2,
    borderColor: "#0b132b",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
});
