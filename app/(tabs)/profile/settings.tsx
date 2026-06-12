import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { ProfileBackButton } from "@/components/profile/profile-back-button";
import { ProfileLogOutButton } from "@/components/profile/profile-log-out-button";
import { ProfileSettingsHeader } from "@/components/profile/profile-settings-header";
import { ProfileSettingsRow } from "@/components/profile/profile-settings-row";
import { ProfileStatsBar } from "@/components/profile/profile-stats-bar";
import { PROFILE_ICON_MUTED } from "@/constants/profile-theme";
import { SPACE_SCREEN_BASE } from "@/constants/space-theme";
import { useHeaderBackButton } from "@/hooks/use-header-back-button";
import { useProfileStats } from "@/hooks/use-profile-stats";
import {
  getLanguageLabel,
  useProfileSettingsStore,
} from "@/store/use-profile-settings-store";

function showComingSoon(label: string) {
  Alert.alert(label, "This feature is coming in a later lesson.");
}

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const darkModeEnabled = useProfileSettingsStore((s) => s.darkModeEnabled);
  const languageCode = useProfileSettingsStore((s) => s.languageCode);
  const setDarkModeEnabled = useProfileSettingsStore(
    (s) => s.setDarkModeEnabled,
  );
  const stats = useProfileStats();
  const { visible: showBack, onBackPress } = useHeaderBackButton();

  const scrollBottomPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar style="light" />
      <View style={[styles.topChrome, { paddingTop: insets.top + 4 }]}>
        {showBack ? (
          <View style={styles.sideSlot}>
            <ProfileBackButton onPress={onBackPress} iconSize={24} size={40} />
          </View>
        ) : (
          <View style={styles.sideSlot} />
        )}

        <Text className="font-semibold text-[18px] text-white">WorldLoop</Text>

        <View style={styles.sideSlot}>
          <Ionicons
            name="settings-outline"
            size={22}
            color={PROFILE_ICON_MUTED}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileSettingsHeader />

        <View style={styles.sectionGap}>
          <ProfileStatsBar
            countries={stats.countriesExplored}
            saved={stats.savedCount}
            photos={stats.photosCount}
          />
        </View>

        <View style={styles.settingsCard}>
          <ProfileSettingsRow
            icon="person-outline"
            label="Personal information"
            onPress={() => showComingSoon("Personal information")}
          />
          <ProfileSettingsRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => showComingSoon("Notifications")}
          />
          <ProfileSettingsRow
            icon="download-outline"
            label="Offline maps"
            onPress={() => showComingSoon("Offline maps")}
          />
          <ProfileSettingsRow
            icon="globe-outline"
            label="Language"
            value={getLanguageLabel(languageCode)}
            onPress={() => showComingSoon("Language")}
          />
          <ProfileSettingsRow
            icon="moon-outline"
            label="Dark mode"
            showChevron={false}
            showToggle
            toggleValue={darkModeEnabled}
            onToggle={setDarkModeEnabled}
          />
          <ProfileSettingsRow
            icon="help-circle-outline"
            label="Help center"
            onPress={() => showComingSoon("Help center")}
          />
          <ProfileSettingsRow
            icon="shield-checkmark-outline"
            label="Privacy & terms"
            onPress={() => showComingSoon("Privacy & terms")}
            isLast
          />
        </View>

        <ProfileLogOutButton />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SPACE_SCREEN_BASE,
  },
  topChrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 44,
  },
  sideSlot: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  sectionGap: {
    marginTop: 16,
    marginBottom: 16,
  },
  settingsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#1a2235",
    overflow: "hidden",
  },
});
