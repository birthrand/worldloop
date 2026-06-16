import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PROFILE_NAV_SUBTITLE,
  PROFILE_SCREEN_BG,
  PROFILE_TEXT_SUBTITLE,
} from "@/constants/profile-theme";

const SHEET_ENTER_SPRING = {
  damping: 22,
  stiffness: 160,
  mass: 0.85,
};

const BACKDROP_MAX_OPACITY = 1;
const BACKDROP_FADE_MS = 260;
const SHEET_DISMISS_MS = 280;

type ProfileEditFieldModalProps = {
  visible: boolean;
  title: string;
  label: string;
  initialValue: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (value: string) => void | Promise<void>;
};

export function ProfileEditFieldModal({
  visible,
  title,
  label,
  initialValue,
  placeholder,
  multiline = false,
  maxLength,
  saving = false,
  error = null,
  onClose,
  onSave,
}: ProfileEditFieldModalProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState(initialValue);
  const [mounted, setMounted] = useState(visible);
  const isClosingRef = useRef(false);

  const translateY = useSharedValue(screenHeight);
  const backdropEnter = useSharedValue(0);

  const finishClose = useCallback(() => {
    isClosingRef.current = false;
    setMounted(false);
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    if (isClosingRef.current || saving) {
      return;
    }

    isClosingRef.current = true;
    cancelAnimation(translateY);
    cancelAnimation(backdropEnter);

    backdropEnter.value = withTiming(0, { duration: BACKDROP_FADE_MS });
    translateY.value = withTiming(
      screenHeight,
      { duration: SHEET_DISMISS_MS },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [backdropEnter, finishClose, saving, screenHeight, translateY]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    if (mounted && !isClosingRef.current) {
      animateClose();
    }
  }, [animateClose, mounted, visible]);

  useEffect(() => {
    if (!mounted || !visible) {
      return;
    }

    setDraft(initialValue);
    isClosingRef.current = false;

    cancelAnimation(translateY);
    cancelAnimation(backdropEnter);
    translateY.value = screenHeight;
    backdropEnter.value = 0;

    backdropEnter.value = withTiming(1, { duration: BACKDROP_FADE_MS });
    translateY.value = withSpring(0, SHEET_ENTER_SPRING);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 320);

    return () => clearTimeout(timer);
  }, [mounted, visible, initialValue, backdropEnter, screenHeight, translateY]);

  const handleSave = async () => {
    if (saving || draft.trim().length === 0) {
      return;
    }

    try {
      await onSave(draft.trim());
      animateClose();
    } catch {
      // Parent sets saveError — keep modal open.
    }
  };

  const backdropStyle = useAnimatedStyle(() => {
    const dismissProgress = interpolate(
      translateY.value,
      [0, screenHeight],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: PROFILE_SCREEN_BG,
      opacity: BACKDROP_MAX_OPACITY * backdropEnter.value * dismissProgress,
    };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: backdropEnter.value > 0.01 ? 1 : 0,
    transform: [{ translateY: translateY.value }],
  }));

  const canSave = draft.trim().length > 0;

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={animateClose}
    >
      <View style={[styles.overlay, { height: screenHeight }]}>
        <Animated.View style={backdropStyle}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close edit modal"
            onPress={animateClose}
            disabled={saving}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetHost}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheetWrap,
              { paddingBottom: Math.max(insets.bottom, 20) },
              sheetStyle,
            ]}
          >
            <View style={styles.sheet}>
              <Text className="font-semibold text-[18px] text-white">
                {title}
              </Text>
              <Text
                className="mt-1 text-[13px] leading-[18px]"
                style={{ color: PROFILE_NAV_SUBTITLE }}
              >
                {label}
              </Text>

              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder={placeholder}
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                multiline={multiline}
                maxLength={maxLength}
                editable={!saving}
                textAlignVertical={multiline ? "top" : "center"}
                style={[
                  styles.input,
                  multiline && styles.inputMultiline,
                  saving && styles.inputDisabled,
                ]}
              />

              {error ? (
                <Text className="mt-2 text-[13px] leading-[18px] text-red-400">
                  {error}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={animateClose}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                    saving && styles.buttonDisabled,
                  ]}
                >
                  <Text className="font-medium text-[15px] text-white/80">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save"
                  onPress={() => void handleSave()}
                  disabled={saving || !canSave}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                    (saving || !canSave) && styles.buttonDisabled,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color={PROFILE_SCREEN_BG} size="small" />
                  ) : (
                    <Text
                      className="font-semibold text-[15px]"
                      style={{ color: PROFILE_SCREEN_BG }}
                    >
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetHost: {
    width: "100%",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    paddingHorizontal: 16,
  },
  sheet: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: PROFILE_SCREEN_BG,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  input: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  inputMultiline: {
    minHeight: 112,
    paddingTop: 12,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: PROFILE_TEXT_SUBTITLE,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
