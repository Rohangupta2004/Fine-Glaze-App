import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';

interface ProgressRingProps {
  /** 0–100 */
  progress: number;
  /** Outer diameter in px */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Show label inside */
  showLabel?: boolean;
  /** Custom label (default: `{progress}%`) */
  label?: string;
  /** Subtitle text below the number */
  subtitle?: string;
  /** Start color of gradient */
  startColor?: string;
  /** End color of gradient */
  endColor?: string;
  /** Track color */
  trackColor?: string;
}

export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 8,
  showLabel = true,
  label,
  subtitle = 'Complete',
  startColor = '#695030',
  endColor = '#918050',
  trackColor = '#E7E5E0',
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="100%" stopColor={endColor} />
          </SvgGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      {showLabel && (
        <View style={styles.labelWrap}>
          <Text style={[styles.value, { fontSize: size * 0.22 }]}>
            {label ?? `${Math.round(clampedProgress)}%`}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { fontSize: Math.max(9, size * 0.1) }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    color: colors.neutral[500],
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
