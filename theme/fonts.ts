import PoppinsBold from "@/assets/fonts/Poppins-Bold.ttf";
import PoppinsMedium from "@/assets/fonts/Poppins-Medium.ttf";
import PoppinsRegular from "@/assets/fonts/Poppins-Regular.ttf";
import PoppinsSemiBold from "@/assets/fonts/Poppins-SemiBold.ttf";

/**
 * Expo font assets — family names match loaded keys
 */
export const fontAssets = {
  "Poppins-Regular": PoppinsRegular,
  "Poppins-Medium": PoppinsMedium,
  "Poppins-SemiBold": PoppinsSemiBold,
  "Poppins-Bold": PoppinsBold,
} as const;

export const fontFamily = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semiBold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
} as const;

export type FontFamily = typeof fontFamily;
