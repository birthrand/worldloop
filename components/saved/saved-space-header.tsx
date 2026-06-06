import { StyleSheet, Text, View } from "react-native";

import { SavedBackButton } from "@/components/saved/saved-back-button";

type SavedSpaceHeaderProps = {
  showReturn?: boolean;
  onReturn?: () => void;
};

export function SavedSpaceHeader({
  showReturn = false,
  onReturn,
}: SavedSpaceHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.sideSlot}>
        {showReturn && onReturn ? (
          <SavedBackButton
            accessibilityLabel="Back to saved map"
            onPress={onReturn}
          />
        ) : null}
      </View>

      <Text className="font-semibold text-[18px] text-white">Saved</Text>

      <View style={styles.sideSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  sideSlot: {
    minWidth: 88,
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
