import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
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
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SHEET_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

const SHEET_DISMISS_DRAG_PX = 88;
const SHEET_DISMISS_VELOCITY = 900;
const SHEET_DISMISS_EXIT_PX = 420;
const SHEET_DISMISS_DURATION_MS = 220;
const BACKDROP_MAX_OPACITY = 0.55;

type SwipeDismissSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  backdropAccessibilityLabel?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function SwipeDismissSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  backdropAccessibilityLabel = "Close sheet",
  accessibilityLabel,
  accessibilityHint = "Swipe down to close",
}: SwipeDismissSheetProps) {
  const canCloseFromBackdropRef = useRef(false);
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  useEffect(() => {
    if (!visible) {
      canCloseFromBackdropRef.current = false;
      cancelAnimation(translateY);
      translateY.value = 0;
      isDismissing.value = false;
      return;
    }

    cancelAnimation(translateY);
    translateY.value = 0;
    isDismissing.value = false;

    const timeout = setTimeout(() => {
      canCloseFromBackdropRef.current = true;
    }, 120);

    return () => clearTimeout(timeout);
  }, [visible, isDismissing, translateY]);

  const dismissSheet = useCallback(() => {
    if (isDismissing.value) return;

    isDismissing.value = true;
    canCloseFromBackdropRef.current = false;

    translateY.value = withTiming(
      SHEET_DISMISS_EXIT_PX,
      { duration: SHEET_DISMISS_DURATION_MS },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  }, [isDismissing, onClose, translateY]);

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
          translateY.value = withTiming(
            SHEET_DISMISS_EXIT_PX,
            { duration: SHEET_DISMISS_DURATION_MS },
            (finished) => {
              if (finished) {
                runOnJS(onClose)();
              }
            },
          );
        }),
    [isDismissing, onClose, translateY],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    opacity: interpolate(
      translateY.value,
      [0, SHEET_DISMISS_EXIT_PX],
      [BACKDROP_MAX_OPACITY, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const dragStyle = useAnimatedStyle(() => ({
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
      <View style={styles.modalOverlay}>
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
            <Animated.View
              entering={SHEET_ENTER}
              style={styles.sheetEnterWrapper}
            >
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
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetEnterWrapper: {
    width: "100%",
  },
});
