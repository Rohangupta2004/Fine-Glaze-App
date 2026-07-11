import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, TOUCH_TARGET } from '../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text` as keyof typeof styles] as TextStyle,
              isDisabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  tertiary: {
    backgroundColor: colors.transparent,
  },
  icon: {
    backgroundColor: colors.neutral[100],
    borderRadius: radius.full,
    paddingHorizontal: 12,
    minWidth: TOUCH_TARGET,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    ...typography.button,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.primary,
  },
  tertiaryText: {
    color: colors.primary,
  },
  iconText: {
    color: colors.ink,
  },
  disabledText: {
    color: colors.neutral[400],
  },
});
