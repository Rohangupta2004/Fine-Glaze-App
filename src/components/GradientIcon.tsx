import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius } from '../theme/spacing';

type IconSize = 'sm' | 'md' | 'lg';
type IconPreset = 'brand' | 'success' | 'warning' | 'info' | 'error';

export interface GradientIconProps {
  name: string;
  size?: IconSize | number;
  preset?: IconPreset;
  colors?: [string, string, ...string[]];
  iconColor?: string;
  iconSize?: number;
  variant?: 'glass' | 'solid';
  onPress?: () => void;
}

const PRESET_CONFIGS: Record<IconPreset, { bg: string; border: string; icon: string }> = {
  brand: {
    bg: 'rgba(105, 80, 48, 0.08)',
    border: 'rgba(184, 144, 71, 0.22)',
    icon: '#695030',
  },
  success: {
    bg: 'rgba(22, 163, 74, 0.12)',
    border: 'rgba(22, 163, 74, 0.25)',
    icon: '#16A34A',
  },
  warning: {
    bg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.25)',
    icon: '#D97706',
  },
  info: {
    bg: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.25)',
    icon: '#2563EB',
  },
  error: {
    bg: 'rgba(220, 38, 38, 0.12)',
    border: 'rgba(220, 38, 38, 0.25)',
    icon: '#DC2626',
  },
};

const SIZE_MAP: Record<IconSize, { box: number; icon: number; radiusKey: keyof typeof radius }> = {
  sm: { box: 28, icon: 14, radiusKey: 'sm' },
  md: { box: 40, icon: 20, radiusKey: 'md' },
  lg: { box: 64, icon: 30, radiusKey: 'full' },
};

export function GradientIcon({
  name,
  size = 'md',
  preset = 'brand',
  iconColor,
  iconSize,
  onPress,
}: GradientIconProps) {
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS.brand;

  const isNumeric = typeof size === 'number';
  const boxDim = isNumeric ? Math.round(size * 1.8) : SIZE_MAP[size].box;
  const actualIconSize = iconSize ?? (isNumeric ? size : SIZE_MAP[size].icon);
  const borderRadius = isNumeric ? Math.round(boxDim / 3.2) : radius[SIZE_MAP[size].radiusKey];

  const actualColor = iconColor || config.icon;

  const content = (
    <View
      style={[
        styles.glassBadge,
        {
          width: boxDim,
          height: boxDim,
          borderRadius: borderRadius,
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <Ionicons name={name as any} size={actualIconSize} color={actualColor} />
    </View>
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
  glassBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(105, 80, 48, 0.05)',
  } as any,
});
