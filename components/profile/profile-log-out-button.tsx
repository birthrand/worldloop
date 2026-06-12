import { useClerk } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text } from "react-native";

import {
  PROFILE_LOGOUT_BG,
  PROFILE_LOGOUT_ICON,
  PROFILE_LOGOUT_PRESSED_BG,
  PROFILE_LOGOUT_TEXT,
} from "@/constants/profile-theme";

export function ProfileLogOutButton() {
  const { signOut } = useClerk();

  const handleLogOut = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await signOut();
            router.replace("/onboarding");
          })();
        },
      },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log out"
      onPress={handleLogOut}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons name="log-out-outline" size={18} color={PROFILE_LOGOUT_ICON} />
      <Text
        className="font-semibold text-[15px]"
        style={{ color: PROFILE_LOGOUT_TEXT }}
      >
        Log out
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 58,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: PROFILE_LOGOUT_BG,
  },
  buttonPressed: {
    backgroundColor: PROFILE_LOGOUT_PRESSED_BG,
  },
});
