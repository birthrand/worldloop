import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import type { ProfileCompletionItemId } from "@/components/profile/profile-completion-card";
import { ProfileEditFieldModal } from "@/components/profile/profile-edit-field-modal";
import { ProfileSettingsHeader } from "@/components/profile/profile-settings-header";
import { ProfileSettingsRow } from "@/components/profile/profile-settings-row";
import { ProfileSettingsSection } from "@/components/profile/profile-settings-section";
import {
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  CULTURE_CHROME_TITLE_SIZE,
  CULTURE_CHROME_TOUCH_SIZE,
} from "@/constants/culture-chrome";
import { PROFILE_SCREEN_BG } from "@/constants/profile-theme";

const DEFAULT_BIO = "Exploring the world, one destination at a time.";
const DEFAULT_HOME_LOCATION = "San Francisco, USA";

type EditField = "name" | "bio" | "homeLocation";

const FIELD_CONFIG: Record<
  EditField,
  {
    title: string;
    label: string;
    placeholder: string;
    multiline?: boolean;
    maxLength: number;
  }
> = {
  name: {
    title: "Edit full name",
    label: "Your name as it appears on your profile",
    placeholder: "Full name",
    maxLength: 80,
  },
  bio: {
    title: "Edit bio",
    label: "Tell others a little about yourself",
    placeholder: "Write a short bio",
    multiline: true,
    maxLength: 160,
  },
  homeLocation: {
    title: "Edit home location",
    label: "Where you call home",
    placeholder: "City, country",
    maxLength: 80,
  },
};

function getDisplayName(user: ReturnType<typeof useUser>["user"]) {
  return user?.fullName ?? user?.firstName ?? user?.username ?? "Traveler";
}

function getBio(user: ReturnType<typeof useUser>["user"]) {
  return typeof user?.unsafeMetadata?.bio === "string" &&
    user.unsafeMetadata.bio
    ? user.unsafeMetadata.bio
    : DEFAULT_BIO;
}

function getHomeLocation(user: ReturnType<typeof useUser>["user"]) {
  return typeof user?.unsafeMetadata?.location === "string" &&
    user.unsafeMetadata.location
    ? user.unsafeMetadata.location
    : DEFAULT_HOME_LOCATION;
}

function showComingSoon(label: string) {
  Alert.alert(label, "This feature is coming in a later lesson.");
}

function parseFullName(value: string) {
  const trimmed = value.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [activeField, setActiveField] = useState<EditField | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayName = getDisplayName(user);
  const email =
    user?.primaryEmailAddress?.emailAddress ?? "alex.morgan@example.com";
  const bio = getBio(user);
  const homeLocation = getHomeLocation(user);

  const activeInitialValue = useMemo(() => {
    if (activeField === "name") {
      return displayName;
    }
    if (activeField === "bio") {
      return bio;
    }
    if (activeField === "homeLocation") {
      return homeLocation;
    }
    return "";
  }, [activeField, bio, displayName, homeLocation]);

  const scrollBottomPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 24;

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    }
  };

  const openField = (field: EditField) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaveError(null);
    setActiveField(field);
  };

  const handleCompletionAdd = (id: ProfileCompletionItemId) => {
    if (id === "name") {
      openField("name");
      return;
    }
    if (id === "bio") {
      openField("bio");
      return;
    }
    if (id === "location") {
      openField("homeLocation");
      return;
    }
    Alert.alert(
      "Email address",
      "Your email is linked to your sign-in account and can't be changed here.",
    );
  };

  const closeField = () => {
    if (saving) {
      return;
    }
    setSaveError(null);
    setActiveField(null);
  };

  const handleSave = useCallback(
    async (value: string) => {
      if (!user || !activeField) {
        return;
      }

      setSaving(true);
      setSaveError(null);

      try {
        if (activeField === "name") {
          const { firstName, lastName } = parseFullName(value);
          await user.update({ firstName, lastName });
        } else if (activeField === "bio") {
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              bio: value,
            },
          });
        } else {
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              location: value,
            },
          });
        }

        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {
        setSaveError("Could not save your changes. Please try again.");
        throw new Error("profile-save-failed");
      } finally {
        setSaving(false);
      }
    },
    [activeField, user],
  );

  const activeConfig = activeField ? FIELD_CONFIG[activeField] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar style="light" />
      <View
        style={{
          paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
          paddingBottom: 4,
        }}
      >
        <WorldLoopHeader
          title="Edit profile"
          showBack
          onBackPress={handleBack}
          backAccessibilityLabel="Back to profile"
          showMenu={false}
          showSearch={false}
          inactiveColor="#ffffff"
          rowHeight={CULTURE_CHROME_TOUCH_SIZE}
          sideSlotWidth={CULTURE_CHROME_TOUCH_SIZE}
          brandFontSize={CULTURE_CHROME_TITLE_SIZE}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileSettingsHeader onCompletionAdd={handleCompletionAdd} />

        <View style={styles.sections}>
          <ProfileSettingsSection title="About you">
            <ProfileSettingsRow
              icon="person-outline"
              label="Full name"
              value={displayName}
              variant="field"
              onPress={() => openField("name")}
            />
            <ProfileSettingsRow
              icon="mail-outline"
              label="Email"
              value={email}
              variant="field"
              disabled
              showChevron={false}
            />
            <ProfileSettingsRow
              icon="create-outline"
              label="Bio"
              value={bio}
              variant="field"
              onPress={() => openField("bio")}
            />
            <ProfileSettingsRow
              icon="location-outline"
              label="Home location"
              value={homeLocation}
              variant="field"
              onPress={() => openField("homeLocation")}
            />
          </ProfileSettingsSection>

          <ProfileSettingsSection title="Travel">
            <ProfileSettingsRow
              icon="flag-outline"
              label="Home country"
              subtitle="Set your home base for travel stats"
              onPress={() => showComingSoon("Home country")}
              isLast
            />
          </ProfileSettingsSection>
        </View>
      </ScrollView>

      {activeConfig ? (
        <ProfileEditFieldModal
          visible={activeField !== null}
          title={activeConfig.title}
          label={activeConfig.label}
          initialValue={activeInitialValue}
          placeholder={activeConfig.placeholder}
          multiline={activeConfig.multiline}
          maxLength={activeConfig.maxLength}
          saving={saving}
          error={saveError}
          onClose={closeField}
          onSave={handleSave}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PROFILE_SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 4,
  },
  sections: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
});
