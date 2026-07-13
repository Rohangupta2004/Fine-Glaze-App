/**
 * GradientCard — Universal bronze→gold gradient hero card with optional glow halo.
 *
 * Use for: hero summary cards, dashboard highlights, CTAs.
 * Brand palette: #695030 (bronze) → #918050 (gold) → #C8B79C (light bronze).
 *
 * Props:
 *  - children: content
 *  - glow: show white glow halo (default true)
 *  - glowPosition: 'top-right' | 'bottom-left' | 'both' (default 'top-right')
 *  - colors: override gradient stops (defaults to brand bronze→gold→light)
 *  - style: extra styles for the gradient container
 */
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { spacing, radius, shadows } from '../theme/spacing';

type GlowPosition = 'top-right' | 'bottom-left' | 'both' | 'none';

/** Tuple type required by expo-linear-gradient's `colors` prop. */
type GradientColors = [string, string, ...string[]];

interface GradientCardProps {
  children: React.ReactNode;
  glow?: boolean;
  glowPosition?: GlowPosition;
  colors?: GradientColors;
  padding?: number;
  radiusSize?: keyof typeof radius;
  shadowSize?: keyof typeof shadows;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_COLORS: GradientColors = ['#695030', '#918050', '#C8B79C'];

export function GradientCard({
  children,
  glow = true,
  glowPosition = 'top-right',
  colors: gradientColors = DEFAULT_COLORS,
  padding = spacing.xl,
  radiusSize = 'xl',
  shadowSize = 'xl',
  style,
}: GradientCardProps) {
  const showTopRight = glow && (glowPosition === 'top-right' || glowPosition === 'both');
  const showBottomLeft = glow && (glowPosition === 'bottom-left' || glowPosition === 'both');

  return (
    <View style={[styles.wrap, { borderRadius: radius[radiusSize], ...shadows[shadowSize] }, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: radius[radiusSize], padding }]}
      >
        {showTopRight && <View style={styles.glowTopRight} pointerEvents="none" />}
        {showBottomLeft && <View style={styles.glowBottomLeft} pointerEvents="none" />}
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
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
