import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

type PaginationVariant = "gold" | "blue";

type OnboardingPaginationProps = {
  count: number;
  activeIndex: number;
  variant?: PaginationVariant;
};

type DotProps = {
  isActive: boolean;
  variant: PaginationVariant;
};

function Dot({ isActive, variant }: DotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(
      variant === "blue" ? 8 : isActive ? 22 : 7,
      { damping: 18, stiffness: 220 },
    ),
    opacity: withSpring(isActive ? 1 : 0.45, { damping: 18, stiffness: 220 }),
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        variant === "blue" && styles.dotBlue,
        isActive && variant === "blue" && styles.dotBlueActive,
        animatedStyle,
      ]}
    />
  );
}

export function OnboardingPagination({
  count,
  activeIndex,
  variant = "gold",
}: OnboardingPaginationProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, index) => (
        <Dot
          key={index}
          isActive={index === activeIndex}
          variant={variant}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FBBF24",
  },
  dotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  dotBlueActive: {
    backgroundColor: "#3B82F6",
  },
});
