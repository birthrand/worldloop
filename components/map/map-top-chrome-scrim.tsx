import { StyleSheet, View } from "react-native";

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

type MapTopChromeScrimProps = {
  paddingTop: number;
};

/** Darkens the top of the map so search + chips stay readable on busy satellite imagery. */
export function MapTopChromeScrim({ paddingTop }: MapTopChromeScrimProps) {
  const height = paddingTop + 108;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrim,
        { height },
        {
          experimental_backgroundImage:
            "linear-gradient(to bottom, rgba(11, 19, 43, 0.92) 0%, rgba(11, 19, 43, 0.72) 45%, rgba(11, 19, 43, 0.28) 78%, rgba(11, 19, 43, 0) 100%)",
        } satisfies GradientViewStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
