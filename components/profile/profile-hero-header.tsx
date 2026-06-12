import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { images } from "@/constants/images";
import {
  PROFILE_HERO_TOP_PADDING,
  PROFILE_NAV_SUBTITLE,
  PROFILE_TEXT_SUBTITLE,
} from "@/constants/profile-theme";
import type { ProfileInlineStats } from "@/hooks/use-profile-stats";

const DEFAULT_BIO = "Exploring the world, one destination at a time.";

type ProfileHeroHeaderProps = {
  stats: ProfileInlineStats;
  onEditPress?: () => void;
  /** Distance from the top of the hero block to the avatar. */
  topInset?: number;
};

export function ProfileHeroHeader({
  stats,
  onEditPress,
  topInset = PROFILE_HERO_TOP_PADDING,
}: ProfileHeroHeaderProps) {
  const { user } = useUser();

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "Traveler";

  const emailLocal = user?.primaryEmailAddress?.emailAddress?.split("@")[0];
  const handle = user?.username
    ? `@${user.username}`
    : emailLocal
      ? `@${emailLocal}`
      : "@traveler";

  const bio =
    typeof user?.unsafeMetadata?.bio === "string" && user.unsafeMetadata.bio
      ? user.unsafeMetadata.bio
      : DEFAULT_BIO;

  const avatarUri = user?.imageUrl ?? null;

  const handleEdit = () => {
    if (onEditPress) {
      onEditPress();
      return;
    }
    router.push("/(tabs)/profile/settings");
  };

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.avatarFrame}>
        <Image
          source={avatarUri ? { uri: avatarUri } : images.profileAvatar}
          style={styles.avatar}
          contentFit="cover"
          accessibilityLabel="Profile photo"
        />
      </View>

      <Text className="text-center font-medium text-[20px] leading-6 text-white">
        {displayName}
      </Text>
      <Text
        className="mt-1 text-center text-[12px] leading-4"
        style={{ color: PROFILE_TEXT_SUBTITLE }}
      >
        {handle}
      </Text>
      <Text className="mt-2 max-w-[280px] text-center text-[14px] leading-5 text-white/75">
        {bio}
      </Text>

      <View style={styles.statsGroup}>
        <InlineStat value={stats.countries} lines={["COUNTRIES", "VISITED"]} />
        <View style={styles.statDivider} />
        <InlineStat value={stats.cities} lines={["CITIES", "EXPLORED"]} />
        <View style={styles.statDivider} />
        <InlineStat value={stats.places} lines={["PLACES", "SAVED"]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        onPress={handleEdit}
        style={({ pressed }) => [
          styles.editButton,
          pressed && styles.editButtonPressed,
        ]}
      >
        <Ionicons name="pencil-outline" size={14} color="#ffffff" />
        <Text className="font-medium text-[13px] text-white">Edit profile</Text>
      </Pressable>
    </View>
  );
}

function InlineStat({
  value,
  lines,
}: {
  value: number;
  lines: [string, string];
}) {
  return (
    <View style={styles.inlineStat}>
      <Text className="font-medium text-[14px] leading-5 text-white">
        {value}
      </Text>
      <View style={styles.labelStack}>
        {lines.map((line) => (
          <Text
            key={line}
            className="text-center text-[10px] leading-[12px] tracking-[0.6px]"
            style={{ color: PROFILE_NAV_SUBTITLE }}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarFrame: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.22)",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  inlineStat: {
    alignItems: "center",
    minWidth: 72,
  },
  labelStack: {
    marginTop: 2,
    alignItems: "center",
    gap: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  editButtonPressed: {
    opacity: 0.85,
  },
});
