import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import {
  SIGN_UP_COLORS,
  SIGN_UP_FIELD_HEIGHT,
  SIGN_UP_FIELD_RADIUS,
  SIGN_UP_TYPOGRAPHY,
} from "@/constants/sign-up-theme";

type SignUpFieldProps = TextInputProps & {
  label: string;
  isPassword?: boolean;
};

export function SignUpField({
  label,
  isPassword = false,
  style,
  ...props
}: SignUpFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...props}
          secureTextEntry={isPassword && !isVisible}
          placeholderTextColor={SIGN_UP_COLORS.fieldPlaceholder}
          style={[styles.input, style]}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isVisible ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setIsVisible((value) => !value)}
            style={styles.trailingButton}
          >
            <Ionicons
              name={isVisible ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={SIGN_UP_COLORS.sheetTextMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: SIGN_UP_COLORS.sheetLabel,
    fontFamily: "Poppins-Medium",
    fontSize: SIGN_UP_TYPOGRAPHY.fieldLabel.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.fieldLabel.lineHeight,
  },
  inputRow: {
    height: SIGN_UP_FIELD_HEIGHT,
    borderRadius: SIGN_UP_FIELD_RADIUS,
    borderWidth: 0.2,
    borderColor: SIGN_UP_COLORS.fieldBorder,
    backgroundColor: SIGN_UP_COLORS.sheetBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    color: SIGN_UP_COLORS.sheetText,
    fontFamily: "Poppins-Regular",
    fontSize: SIGN_UP_TYPOGRAPHY.fieldValue.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.fieldValue.lineHeight,
    paddingVertical: 0,
  },
  trailingButton: {
    marginLeft: 8,
    padding: 4,
  },
});
