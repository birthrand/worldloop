import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ProfileCompletionCard } from "@/components/profile/profile-completion-card";
import { images } from "@/constants/images";
import {
  PROFILE_EDIT_BADGE_BG,
  PROFILE_EDIT_BADGE_ICON,
  PROFILE_SCREEN_BG,
  PROFILE_TEXT_SUBTITLE,
} from "@/constants/profile-theme";

const DEFAULT_LOCATION = "San Francisco, USA";

function showComingSoon(label: string) {
  Alert.alert(label, "This feature is coming in a later lesson.");
}

export function ProfileSettingsHeader() {
  const { user } = useUser();

  const emailLocal = user?.primaryEmailAddress?.emailAddress?.split("@")[0];
  const handle = user?.username
    ? `@${user.username}`
    : emailLocal
      ? `@${emailLocal}`
      : "@traveler";

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          onPress={() => showComingSoon("Change photo")}
          style={({ pressed }) => [
            styles.editBadge,
            pressed && styles.editBadgePressed,
          ]}
        >
          <Ionicons name="camera" size={13} color={PROFILE_EDIT_BADGE_ICON} />
        </Pressable>
      </View>

      <Text
        className="mt-3 text-center text-[13px] leading-[18px]"
        style={{ color: PROFILE_TEXT_SUBTITLE }}
      >
        {handle}
      </Text>

      <View style={styles.locationChip}>
        <Ionicons
          name="location-outline"
          size={13}
          color={PROFILE_TEXT_SUBTITLE}
        />
        <Text
          className="text-[13px] leading-[18px]"
          style={{ color: PROFILE_TEXT_SUBTITLE }}
          numberOfLines={1}
        >
          {location}
        </Text>
      </View>

      <ProfileCompletionCard />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  avatarWrap: {
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_EDIT_BADGE_BG,
    borderWidth: 2.5,
    borderColor: PROFILE_SCREEN_BG,
  },
  editBadgePressed: {
    opacity: 0.85,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    maxWidth: "100%",
  },
});
