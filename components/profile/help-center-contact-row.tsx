import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  PROFILE_ICON,
  PROFILE_ICON_BOX_RADIUS,
  PROFILE_ICON_RING,
  PROFILE_NAV_SUBTITLE,
} from "@/constants/profile-theme";
import { SUPPORT_EMAIL } from "@/constants/support";

export function HelpCenterContactRow() {
  const handleCopyEmail = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(SUPPORT_EMAIL);
    Alert.alert("Email copied", `${SUPPORT_EMAIL} is ready to paste.`);
  };

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Ionicons name="mail-outline" size={18} color={PROFILE_ICON} />
        </View>
        <View style={styles.textBlock}>
          <Text className="font-medium text-[15px] text-white">
            Contact support
          </Text>
          <Text
            className="mt-0.5 text-[13px] leading-[18px]"
            style={{ color: PROFILE_NAV_SUBTITLE }}
          >
            Questions, feedback, or bug reports
          </Text>
          <Text className="mt-1.5 text-[14px] text-white/80">
            {SUPPORT_EMAIL}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy support email"
        onPress={() => void handleCopyEmail()}
        style={({ pressed }) => [
          styles.copyButton,
          pressed && styles.copyPressed,
        ]}
      >
        <Ionicons name="copy-outline" size={18} color={PROFILE_ICON} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: PROFILE_ICON_BOX_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: PROFILE_ICON_RING,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  copyButton: {
    width: 38,
    height: 38,
    borderRadius: PROFILE_ICON_BOX_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: PROFILE_ICON_RING,
    marginTop: 2,
  },
  copyPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
