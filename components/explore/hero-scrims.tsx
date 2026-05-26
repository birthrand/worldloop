import { StyleSheet, View } from "react-native";

/** Covers lower ~75% of the screen — fade to black at bottom. */
const BOTTOM_SCRIM_HEIGHT_RATIO = 0.75;

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

type HeroScrimsProps = {
  pageHeight: number;
};

export function HeroScrims({ pageHeight }: HeroScrimsProps) {
  const bottomHeight = pageHeight * BOTTOM_SCRIM_HEIGHT_RATIO;

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.base,
          styles.top,
          {
            experimental_backgroundImage:
              "linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.22) 40%, rgba(0, 0, 0, 0) 100%)",
          } satisfies GradientViewStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.base,
          styles.bottom,
          { height: bottomHeight },
          {
            experimental_backgroundImage:
              "linear-gradient(to top, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 22%, rgba(0, 0, 0, 0.9) 38%, rgba(0, 0, 0, 0.65) 55%, rgba(0, 0, 0, 0.35) 72%, rgba(0, 0, 0, 0.1) 88%, rgba(0, 0, 0, 0) 100%)",
          } satisfies GradientViewStyle,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  top: {
    top: 0,
    height: 220,
  },
  bottom: {
    bottom: 0,
  },
});
