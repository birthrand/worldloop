import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AUTH_CARD_RADIUS,
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

const CODE_LENGTH = 6;

type AuthVerificationModalProps = {
  visible: boolean;
  email: string;
  error?: string | null;
  loading?: boolean;
  onClose: () => void;
  onVerify: (code: string) => void | Promise<void>;
  onResend?: () => void | Promise<void>;
};

export function AuthVerificationModal({
  visible,
  email,
  error = null,
  loading = false,
  onClose,
  onVerify,
  onResend,
}: AuthVerificationModalProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!visible) {
      setCode("");
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    return () => clearTimeout(timer);
  }, [visible]);

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);

    if (digits.length === CODE_LENGTH && !loading) {
      inputRef.current?.blur();
      void onVerify(digits);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close verification modal"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetWrap,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.message}>
              We sent a 6-digit verification code to{" "}
              <Text style={styles.email}>{email || "your email"}</Text>. Enter
              it below to continue.
            </Text>

            <Pressable
              accessibilityRole="none"
              onPress={() => inputRef.current?.focus()}
              style={styles.codeRow}
            >
              {Array.from({ length: CODE_LENGTH }, (_, index) => {
                const digit = code[index] ?? "";
                const isActive = code.length === index;

                return (
                  <View
                    key={index}
                    style={[styles.codeCell, isActive && styles.codeCellActive]}
                  >
                    <Text style={styles.codeDigit}>{digit}</Text>
                  </View>
                );
              })}
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {loading ? (
              <ActivityIndicator
                color={AUTH_COLORS.gold}
                style={styles.loader}
              />
            ) : null}

            {onResend ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend verification code"
                onPress={() => void onResend()}
                disabled={loading}
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed && styles.resendButtonPressed,
                ]}
              >
                <Text style={styles.resendLabel}>Resend code</Text>
              </Pressable>
            ) : null}

            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              caretHidden
              editable={!loading}
              style={styles.hiddenInput}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_COLORS.modalBackdrop,
  },
  sheetWrap: {
    paddingHorizontal: 20,
  },
  sheet: {
    borderRadius: AUTH_CARD_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: AUTH_COLORS.modalSheetBg,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontFamily: "Poppins-SemiBold",
    fontSize: AUTH_TYPOGRAPHY.title.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.title.lineHeight,
    textAlign: "center",
  },
  message: {
    color: AUTH_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: AUTH_TYPOGRAPHY.subtitle.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.subtitle.lineHeight,
    textAlign: "center",
  },
  email: {
    color: AUTH_COLORS.textSubtle,
    fontFamily: "Poppins-Medium",
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  codeCell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AUTH_COLORS.inputBorder,
    backgroundColor: AUTH_COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  codeCellActive: {
    borderColor: AUTH_COLORS.gold,
  },
  codeDigit: {
    color: AUTH_COLORS.textPrimary,
    fontFamily: "Poppins-SemiBold",
    fontSize: 20,
    lineHeight: 24,
  },
  error: {
    color: "#F87171",
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  loader: {
    marginTop: -4,
  },
  resendButton: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  resendButtonPressed: {
    opacity: 0.75,
  },
  resendLabel: {
    color: AUTH_COLORS.gold,
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
});
