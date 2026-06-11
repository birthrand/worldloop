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
  AUTH_COLORS,
  AUTH_FIELD_HEIGHT,
  AUTH_FIELD_RADIUS,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

type AuthLabeledFieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
};

export function AuthLabeledField({
  label,
  icon,
  isPassword = false,
  style,
  ...props
}: AuthLabeledFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Ionicons
        name={icon}
        size={20}
        color={AUTH_COLORS.gold}
        style={styles.leadingIcon}
      />

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          {...props}
          secureTextEntry={isPassword && !isVisible}
          placeholderTextColor={AUTH_COLORS.sheetLabel}
          style={[styles.input, style]}
        />
      </View>

      {isPassword ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? "Hide password" : "Show password"}
          hitSlop={8}
          onPress={() => setIsVisible((value) => !value)}
          style={styles.trailingButton}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
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
    minHeight: AUTH_FIELD_HEIGHT,
    borderRadius: AUTH_FIELD_RADIUS,
    borderWidth: 1,
    borderColor: AUTH_COLORS.fieldBorder,
    backgroundColor: AUTH_COLORS.fieldBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leadingIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: AUTH_COLORS.sheetLabel,
    fontFamily: "Poppins-Regular",
    fontSize: AUTH_TYPOGRAPHY.fieldLabel.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.fieldLabel.lineHeight,
  },
  input: {
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
