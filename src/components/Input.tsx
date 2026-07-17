import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  theme?: 'light' | 'dark';
}

export function Input({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  theme = 'light',
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const isDark = theme === 'dark';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, isDark && styles.labelDark]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          isDark && styles.inputContainerDark,
          focused && (isDark ? styles.focusedDark : styles.focused),
          error && styles.errorBorder,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? colors.primary : (isDark ? colors.authPlaceholder : colors.neutral[400])}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, isDark && styles.inputDark, style]}
          placeholderTextColor={isDark ? colors.authPlaceholder : colors.neutral[400]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={8}>
            <Ionicons
              name={rightIcon}
              size={20}
              color={isDark ? colors.authPlaceholder : colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  labelDark: {
    color: colors.authText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  inputContainerDark: {
    backgroundColor: colors.authSurface,
    borderColor: colors.authBorder,
  },
  focused: {
    borderColor: colors.primary,
  },
  focusedDark: {
    borderColor: colors.secondary,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  inputDark: {
    color: colors.authText,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
