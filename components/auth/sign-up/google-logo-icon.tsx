import { Image } from "expo-image";

import { images } from "@/constants/images";

type GoogleLogoIconProps = {
  size?: number;
};

export function GoogleLogoIcon({ size = 20 }: GoogleLogoIconProps) {
  return (
    <Image
      source={images.googleLogo}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
