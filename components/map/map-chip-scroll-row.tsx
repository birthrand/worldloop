import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type MapChipScrollRowProps = {
  children: ReactNode;
};

export function MapChipScrollRow({ children }: MapChipScrollRowProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    alignItems: "center",
  },
});
