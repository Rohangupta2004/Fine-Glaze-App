/**
 * GradientIcon — Circular icon with gradient background and glow shadow.
 *
 * Use for: status indicators, list-row leading icons, empty-state heroes.
 *
 * Props:
 *  - name: Ionicons name
 *  - size: 'sm' | 'md' | 'lg' (28 / 44 / 72 px)
 *  - colors: gradient stops
 *    - Default 'success' preset: green gradient
 *    - Default 'warning' preset: amber gradient
 *    - Default 'brand' preset: bronze→gold
 *    - Default 'info' preset: blue gradient
 *  - iconColor: icon foreground color (default white)
 *  - onPress: tap handler (renders TouchableOpacity if provided)
 */
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { spacing, radius, shadows } from '../theme/spacing';

type IconSize = 'sm' | 'md' | 'lg';
type IconPreset = 'brand' | 'success' | 'warning' | 'info' | 'error';

interface GradientIconProps {
  name: string;
  size?: IconSize;
  preset?: IconPreset;
  colors?: [string, string, ...string[]];
  iconColor?: string;
  iconSize?: number;
  onPress?: () => void;
}

const PRESETS: Record<IconPreset, [string, string]> = {
  brand: ['#695030', '#918050'],
  success: ['#86EFAC', '#22C55E'],
  warning: ['#FDE68A', '#F59E0B'],
  info: ['#93C5FD', '#3B82F6'],
  error: ['#FCA5A5', '#EF4444'],
};

const SIZE_MAP: Record<IconSize, { box: number; icon: number; radiusKey: keyof typeof radius }> = {
  sm: { box: 28, icon: 14, radiusKey: 'sm' },
  md: { box: 44, icon: 20, radiusKey: 'md' },
  lg: { box: 72, icon: 32, radiusKey: 'full' },
};

export function GradientIcon({
  name,
  size = 'md',
  preset,
  colors,
  iconColor = '#FFFFFF',
  iconSize,
  onPress,
}: GradientIconProps) {
  const gradientColors = colors || (preset ? PRESETS[preset] : PRESETS.brand);
  const sizeConfig = SIZE_MAP[size];
  const actualIconSize = iconSize ?? sizeConfig.icon;

  const content = (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradient,
        {
          width: sizeConfig.box,
          height: sizeConfig.box,
          borderRadius: radius[sizeConfig.radiusKey],
        },
      ]}
    >
      <Ionicons name={name as any} size={actualIconSize} color={iconColor} />
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} hitSlop={8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
