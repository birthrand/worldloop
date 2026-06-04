import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlagBadge } from "@/components/explore/flag-badge";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { cca3FromCca2 } from "@/lib/cca2-to-cca3";

type AIContentExplorerHeaderProps = {
  countryName: string;
  flag: string;
  iso2: string;
  onBack: () => void;
};

export function AIContentExplorerHeader({
  countryName,
  flag,
  iso2,
  onBack,
}: AIContentExplorerHeaderProps) {
  const insets = useSafeAreaInsets();
  const countryCode =
    cca3FromCca2(iso2) || iso2.trim().toUpperCase() || countryName;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons
          name="chevron-back"
          size={22}
          color={AI_EXPLORER_THEME.textPrimary}
        />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text accessibilityLabel={countryName} style={styles.title}>
          {countryCode}
        </Text>
        <FlagBadge flag={flag} iso2={iso2} width={32} height={22} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AI_EXPLORER_THEME.divider,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.85,
    borderColor: AI_EXPLORER_THEME.borderStrong,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    lineHeight: 26,
    color: AI_EXPLORER_THEME.textPrimary,
    letterSpacing: 1,
  },
});
