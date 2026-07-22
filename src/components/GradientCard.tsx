import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { spacing, radius, shadows } from '../theme/spacing';
import { CardVariant } from './Card';

type GlowPosition = 'top-right' | 'bottom-left' | 'both' | 'none';

type GradientColors = [string, string, ...string[]];

export interface GradientCardProps {
  children: React.ReactNode;
  glow?: boolean;
  glowPosition?: GlowPosition;
  colors?: GradientColors;
  padding?: number;
  radiusSize?: keyof typeof radius;
  shadowSize?: keyof typeof shadows;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_COLORS: GradientColors = ['#695030', '#918050', '#C8B79C'];

export function GradientCard({
  children,
  glow = true,
  glowPosition = 'top-right',
  colors: gradientColors,
  padding = spacing.xl,
  radiusSize = 'xl',
  shadowSize = 'xl',
  variant,
  onPress,
  style,
}: GradientCardProps) {
  const showTopRight = glow && (glowPosition === 'top-right' || glowPosition === 'both');
  const showBottomLeft = glow && (glowPosition === 'bottom-left' || glowPosition === 'both');

  const getColors = (): GradientColors => {
    if (gradientColors) return gradientColors;
    if (variant === 'champagne') return ['#FFFFFF', '#FAF5EC', '#F1E2CA'];
    if (variant === 'gold') return ['#4A3728', '#695030', '#8B6840'];
    if (variant === 'obsidian') return ['#1C1713', '#2A221C', '#3D3126'];
    return DEFAULT_COLORS;
  };

  const content = (
    <View style={[styles.wrap, { borderRadius: radius[radiusSize], ...shadows[shadowSize] }, style]}>
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: radius[radiusSize], padding }]}
      >
        {/* Glass top specular line */}
        <View style={styles.glassShine} pointerEvents="none" />
        {showTopRight && <View style={styles.glowTopRight} pointerEvents="none" />}
        {showBottomLeft && <View style={styles.glowBottomLeft} pointerEvents="none" />}
        {children}
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.84}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.28)',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
