import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SHEET_ENTER_SPRING = {
  damping: 20,
  stiffness: 150,
  mass: 0.85,
};

const SHEET_DISMISS_DRAG_PX = 88;
const SHEET_DISMISS_VELOCITY = 900;
const SHEET_DISMISS_DURATION_MS = 280;
const BACKDROP_MAX_OPACITY = 0.55;
const BACKDROP_FADE_IN_MS = 280;

function dismissDurationMs(distancePx: number, screenHeight: number): number {
  const normalized = Math.min(1, distancePx / screenHeight);
  return Math.round(SHEET_DISMISS_DURATION_MS * (0.55 + normalized * 0.45));
}

type SwipeDismissSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  /** Backdrop opacity at rest (fades to 0 while swiping down). */
  backdropMaxOpacity?: number;
  backdropAccessibilityLabel?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** When false, sheet stays off-screen until ready — backdrop still fades in. */
  enterReady?: boolean;
  onEntered?: () => void;
};

export function SwipeDismissSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  backdropMaxOpacity = BACKDROP_MAX_OPACITY,
  backdropAccessibilityLabel = "Close sheet",
  accessibilityLabel,
  accessibilityHint = "Swipe down to close",
  enterReady = true,
  onEntered,
}: SwipeDismissSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const dismissExitY = screenHeight;
  const canCloseFromBackdropRef = useRef(false);
  const translateY = useSharedValue(screenHeight);
  const backdropEnter = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  useEffect(() => {
    if (!visible) {
      canCloseFromBackdropRef.current = false;
      cancelAnimation(translateY);
      cancelAnimation(backdropEnter);
      translateY.value = dismissExitY;
      backdropEnter.value = 0;
      isDismissing.value = false;
      return;
    }

    cancelAnimation(translateY);
    cancelAnimation(backdropEnter);
    isDismissing.value = false;
    backdropEnter.value = 0;
    translateY.value = dismissExitY;

    if (!enterReady) return;

    backdropEnter.value = withTiming(1, { duration: BACKDROP_FADE_IN_MS });
    translateY.value = withSpring(0, SHEET_ENTER_SPRING, (finished) => {
      if (finished && onEntered) {
        runOnJS(onEntered)();
      }
    });

    const timeout = setTimeout(() => {
      canCloseFromBackdropRef.current = true;
    }, 120);

    return () => clearTimeout(timeout);
  }, [
    visible,
    enterReady,
    backdropEnter,
    dismissExitY,
    isDismissing,
    onEntered,
    translateY,
  ]);

  const dismissSheet = useCallback(() => {
    if (isDismissing.value) return;

    isDismissing.value = true;
    canCloseFromBackdropRef.current = false;

    const distance = dismissExitY - translateY.value;
    translateY.value = withTiming(
      dismissExitY,
      { duration: dismissDurationMs(distance, dismissExitY) },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  }, [dismissExitY, isDismissing, onClose, translateY]);

  const handleBackdropClose = () => {
    if (!canCloseFromBackdropRef.current || isDismissing.value) return;
    dismissSheet();
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          if (isDismissing.value) return;
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (isDismissing.value) return;

          const shouldDismiss =
            event.translationY > SHEET_DISMISS_DRAG_PX ||
            event.velocityY > SHEET_DISMISS_VELOCITY;

          if (!shouldDismiss) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
            return;
          }

          isDismissing.value = true;
          const distance = dismissExitY - translateY.value;
          const duration = Math.round(
            SHEET_DISMISS_DURATION_MS *
              (0.55 + Math.min(1, distance / dismissExitY) * 0.45),
          );
          translateY.value = withTiming(
            dismissExitY,
            { duration },
            (finished) => {
              if (finished) {
                runOnJS(onClose)();
              }
            },
          );
        }),
    [dismissExitY, isDismissing, onClose, translateY],
  );

  const backdropStyle = useAnimatedStyle(() => {
    const dismissProgress = interpolate(
      translateY.value,
      [0, dismissExitY],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000",
      opacity: backdropMaxOpacity * backdropEnter.value * dismissProgress,
    };
  });

  const dragStyle = useAnimatedStyle(() => ({
    opacity: backdropEnter.value > 0.01 ? 1 : 0,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleBackdropClose}
    >
      <View style={[styles.modalOverlay, { height: screenHeight }]}>
        <Animated.View style={backdropStyle}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={backdropAccessibilityLabel}
            onPress={handleBackdropClose}
          />
        </Animated.View>
        {visible ? (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.sheetEnterWrapper}>
              <Animated.View
                style={[sheetStyle, dragStyle]}
                accessibilityViewIsModal
                accessibilityRole="adjustable"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
              >
                {children}
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetEnterWrapper: {
    width: "100%",
  },
});
