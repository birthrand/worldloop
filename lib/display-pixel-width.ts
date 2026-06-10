import { Dimensions, PixelRatio } from "react-native";

/** Logical width × device pixel ratio — used for DPR-aware hero image URLs. */
export function getHeroDisplayPixelWidth(): number {
  const { width } = Dimensions.get("window");
  return Math.round(width * PixelRatio.get());
}
