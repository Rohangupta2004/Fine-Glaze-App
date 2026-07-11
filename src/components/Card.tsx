import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius, shadows } from '../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'elevated' | 'interactive' | 'flat';
  padding?: number;
}

export function Card({
  children,
  onPress,
  style,
  variant = 'elevated',
  padding = spacing.lg,
}: CardProps) {
  const cardStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'interactive' && styles.interactive,
    variant === 'flat' && styles.flat,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
  },
  elevated: {
    ...shadows.md,
  },
  interactive: {
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  flat: {
    backgroundColor: colors.neutral[100],
  },
});
