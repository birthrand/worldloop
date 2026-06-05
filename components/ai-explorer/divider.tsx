import { StyleSheet, View, ViewStyle } from "react-native";

import { DIVIDER_COLOR } from "@/constants/ai-explorer-theme";

export { DIVIDER_COLOR };

type DividerProps = {
  style?: ViewStyle;
  /** Inset from the left edge (useful when aligning with text). */
  inset?: number;
  /** Render a vertical rule instead of a horizontal line. */
  vertical?: boolean;
};

export function Divider({ style, inset = 0, vertical = false }: DividerProps) {
  return (
    <View
      style={[
        vertical ? styles.lineVertical : styles.line,
        !vertical && inset > 0 && { marginLeft: inset },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER_COLOR,
  },
  lineVertical: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: DIVIDER_COLOR,
  },
});
