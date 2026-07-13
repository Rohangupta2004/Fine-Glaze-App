/**
 * GradientProgressBar — Pill-shaped progress bar with gradient fill.
 *
 * Use for: collection %, project progress %, attendance %.
 *
 * Props:
 *  - value: 0-100
 *  - preset: 'success' | 'warning' | 'info' | 'brand' (gradient color scheme)
 *  - colors: custom gradient stops (overrides preset)
 *  - height: bar thickness in px (default 10)
 *  - showLabel: show "X%" label to the right of the bar
 *  - onLight: when true, track is translucent white (for use inside GradientCard)
 *  - style: container style override
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { radius } from '../theme/spacing';

type BarPreset = 'success' | 'warning' | 'info' | 'brand';

interface GradientProgressBarProps {
  value: number;
  preset?: BarPreset;
  colors?: [string, string, ...string[]];
  height?: number;
  showLabel?: boolean;
  onLight?: boolean;
  labelColor?: string;
  style?: any;
}

const PRESETS: Record<BarPreset, [string, string]> = {
  success: ['#86EFAC', '#22C55E'],
  warning: ['#FDE68A', '#F59E0B'],
  info:    ['#93C5FD', '#3B82F6'],
  brand:   ['#695030', '#918050'],
};

export function GradientProgressBar({
  value,
  preset = 'success',
  colors: customColors,
  height = 10,
  showLabel = false,
  onLight = false,
  labelColor,
  style,
}: GradientProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const gradientColors = customColors || PRESETS[preset];
  const trackBg = onLight ? 'rgba(255, 255, 255, 0.18)' : colors.neutral[100];

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height, backgroundColor: trackBg, borderRadius: radius.full }]}>
        {clamped > 0 && (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${clamped}%`, height, borderRadius: radius.full }]}
          />
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: labelColor || (onLight ? 'rgba(255,255,255,0.85)' : colors.neutral[500]) }]}>
          {clamped}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {},
  label: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    minWidth: 32,
    textAlign: 'right',
  },
});
