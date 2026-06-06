import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { resolveFlagCdnUrl } from "@/lib/flag-url";

type FlagBadgeProps = {
  flag: string;
  /** ISO alpha-2 fallback when `flag` is still a legacy Wikimedia URL from cache. */
  iso2?: string;
  width?: number;
  height?: number;
  circular?: boolean;
};

/**
 * Renders the country flag from flagcdn only.
 * Never prints the URL as text — uses a neutral placeholder if the URL is invalid.
 */
export function FlagBadge({
  flag,
  iso2,
  width = 48,
  height = 32,
  circular = false,
}: FlagBadgeProps) {
  const uri = resolveFlagCdnUrl(flag, iso2);
  const size = circular ? Math.min(width, height) : undefined;
  const frameStyle = [
    styles.frame,
    circular && styles.frameCircular,
    circular && size != null
      ? { width: size, height: size, borderRadius: size / 2 }
      : { width, height },
  ];

  if (!uri) {
    return (
      <View style={frameStyle}>
        <Text
          style={[
            styles.placeholderEmoji,
            circular &&
              size != null && { fontSize: size * 0.55, lineHeight: size },
          ]}
        >
          🏳️
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={frameStyle}
      contentFit="cover"
      accessibilityLabel="Country flag"
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  frameCircular: {
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  placeholderEmoji: {
    fontSize: 22,
    textAlign: "center",
    lineHeight: 32,
  },
});
