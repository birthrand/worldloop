import { StyleSheet, View } from "react-native";

import { SIGN_UP_COLORS } from "@/constants/sign-up-theme";

const TILE_SIZE = 28;
const ROWS = 6;
const COLS = 14;

export function SignUpHeaderPattern() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => (
          <View
            key={`${row}-${col}`}
            style={[
              styles.tile,
              {
                left: col * TILE_SIZE,
                top: row * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              },
            ]}
          />
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  tile: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SIGN_UP_COLORS.patternLine,
  },
});
