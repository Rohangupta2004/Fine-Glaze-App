import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  color = colors.primary,
  trackColor = colors.neutral[100],
  height = 8,
  style,
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  return (
    <View style={{ ...styles.track, ...style, height, backgroundColor: trackColor }}>
      <View style={{ width: `${safeValue}%`, height, borderRadius: radius.full, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.full,
  },
});
