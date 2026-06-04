import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { ProfileSection } from "@/components/ai-explorer/profile-section";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { images as appImages } from "@/constants/images";
import type { CountryLandmark } from "@/lib/api";

type CountryLandmarksSectionProps = {
  landmarks: CountryLandmark[];
};

export function CountryLandmarksSection({
  landmarks,
}: CountryLandmarksSectionProps) {
  if (landmarks.length === 0) return null;

  return (
    <ProfileSection title="Landmarks">
      <View style={styles.list}>
        {landmarks.map((landmark) => (
          <View key={landmark.id} style={styles.card}>
            <View style={styles.imageFrame}>
              {landmark.imageUrl ? (
                <Image
                  source={{ uri: landmark.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  accessibilityLabel={landmark.name}
                />
              ) : (
                <Image
                  source={appImages.earthTopography}
                  style={styles.placeholderImage}
                  contentFit="cover"
                />
              )}
              <View style={styles.nameOverlay}>
                <Text style={styles.name} numberOfLines={2}>
                  {landmark.name}
                </Text>
              </View>
            </View>
            <Text style={styles.description}>{landmark.description}</Text>
          </View>
        ))}
      </View>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  card: {
    gap: 8,
  },
  imageFrame: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  nameOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  name: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: AI_EXPLORER_THEME.textPrimary,
  },
  description: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: AI_EXPLORER_THEME.textSecondary,
  },
});
