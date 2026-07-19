import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { spacing, radius, shadows } from '../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * elevated   – default lift with subtle shadow
   * interactive – list rows/tappables with medium shadow + border
   * flat       – flat muted surface
   * glow       – strong hero shadow
   */
  variant?: 'elevated' | 'interactive' | 'flat' | 'glow';
  padding?: number;
  accentColor?: string; // Optional left accent stripe color
  gradientColors?: [string, string, ...string[]]; // Custom gradient colors
}

export function Card({
  children,
  onPress,
  style,
  variant = 'elevated',
  padding = spacing.lg,
  accentColor,
  gradientColors,
}: CardProps) {
  // Flatten style object to inspect and filter properties
  const flattenedStyle = StyleSheet.flatten(style) || {};

  // Extract background color override if any, to avoid solid colors breaking glassmorphism
  const {
    backgroundColor,
    width, height, minWidth, minHeight, flex,
    margin, marginHorizontal, marginVertical, marginTop, marginBottom, marginLeft, marginRight,
    position, top, bottom, left, right, zIndex,
    ...innerStyle
  } = flattenedStyle;

  const outerStyle = {
    width, height, minWidth, minHeight, flex,
    margin, marginHorizontal, marginVertical, marginTop, marginBottom, marginLeft, marginRight,
    position, top, bottom, left, right, zIndex
  };

  const cardStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'interactive' && styles.interactive,
    variant === 'flat' && styles.flat,
    variant === 'glow' && styles.glow,
    outerStyle,
  ];

  // Colors for glassmorphic soft gradient background
  const defaultGradientColors = variant === 'flat'
    ? ['rgba(255,255,255,1)', 'rgba(255,255,255,0.4)']
    : ['#FFFFFF', 'rgba(255,255,255,0.7)'];

  const finalGradientColors = gradientColors || defaultGradientColors;

  const renderContent = () => (
    <LinearGradient
      colors={finalGradientColors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradientContent,
        { padding },
        innerStyle,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null
      ]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={cardStyle}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gradientContent: {
    width: '100%',
    height: '100%',
  },
  elevated: {
    ...shadows.sm,
  },
  interactive: {
    ...shadows.md,
  },
  flat: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  glow: {
    ...shadows.lg,
  },
});
