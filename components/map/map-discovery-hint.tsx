import { StyleSheet, Text, View } from "react-native";

type MapDiscoveryHintProps = {
  count: number;
  bottom: number;
};

export function MapDiscoveryHint({ count, bottom }: MapDiscoveryHintProps) {
  const label =
    count === 1 ? "1 country in view" : `${count} countries in view`;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="none">
      <View style={styles.pill}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(18, 24, 38, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.88)",
  },
});
