/**
 * GradientButton — Bronze→gold gradient button with glow shadow.
 *
 * Drop-in replacement for the flat `Button` component when you want a
 * premium CTA look. Uses brand palette by default, but accepts custom colors.
 *
 * Props:
 *  - title, onPress, disabled, loading, icon (same as Button)
 *  - colors: gradient stops (default bronze→gold)
 *  - fullWidth: stretch to container width
 *  - size: 'md' | 'lg'
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius, shadows, TOUCH_TARGET } from '../theme/spacing';

type ButtonSize = 'md' | 'lg';

/** Tuple type required by expo-linear-gradient's `colors` prop. */
type GradientColors = [string, string, ...string[]];

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  colors?: GradientColors;
  fullWidth?: boolean;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const DEFAULT_COLORS: GradientColors = ['#695030', '#918050'];

export function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  colors: gradientColors = DEFAULT_COLORS,
  fullWidth = false,
  size = 'md',
  style,
  textStyle,
}: GradientButtonProps) {
  const isDisabled = disabled || loading;
  const sizeStyle = size === 'lg' ? styles.lg : styles.md;

  return (
    <View
      style={[
        styles.wrap,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabledWrap,
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={styles.touchable}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              {icon && iconPosition === 'left' && (
                <Ionicons name={icon as any} size={18} color={colors.white} />
              )}
              <Text style={[styles.text, textStyle]}>{title}</Text>
              {icon && iconPosition === 'right' && (
                <Ionicons name={icon as any} size={18} color={colors.white} />
              )}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabledWrap: {
    opacity: 0.5,
    ...shadows.sm,
  },
  touchable: {
    borderRadius: radius.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: TOUCH_TARGET,
  },
  lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  text: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },
});
