import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import {
  AUTH_COLORS,
  AUTH_FIELD_RADIUS,
  AUTH_INPUT_HEIGHT,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

type AuthFormFieldProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
};

export function AuthFormField({
  icon,
  isPassword = false,
  style,
  ...props
}: AuthFormFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Ionicons
        name={icon}
        size={20}
        color={AUTH_COLORS.gold}
        style={styles.leadingIcon}
      />
      <TextInput
        {...props}
        secureTextEntry={isPassword && !isVisible}
        placeholderTextColor={AUTH_COLORS.sheetLabel}
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
            color={AUTH_COLORS.sheetTextMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: AUTH_INPUT_HEIGHT,
    borderRadius: AUTH_FIELD_RADIUS,
    borderWidth: 1,
    borderColor: AUTH_COLORS.fieldBorder,
    backgroundColor: AUTH_COLORS.fieldBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  leadingIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: AUTH_COLORS.sheetText,
    fontFamily: "Poppins-SemiBold",
    fontSize: AUTH_TYPOGRAPHY.fieldValue.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.fieldValue.lineHeight,
    paddingVertical: 0,
  },
  trailingButton: {
    marginLeft: 8,
    padding: 4,
  },
});
