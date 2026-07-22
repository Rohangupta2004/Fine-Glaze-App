import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../theme/spacing';

export type CardVariant = 'elevated' | 'interactive' | 'flat' | 'glow' | 'champagne' | 'gold' | 'obsidian';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * gold/obsidian/glow – hero gradient cards for dashboards
   * champagne/flat/elevated – clean porcelain cards for screens & lists
   */
  variant?: CardVariant;
  padding?: number;
  accentColor?: string; // Optional left accent stripe color
  gradientColors?: [string, string, ...string[]]; // Custom gradient colors
}

export function Card({
  children,
  onPress,
  style,
  variant = 'champagne',
  padding = spacing.lg,
  accentColor,
  gradientColors,
}: CardProps) {
  const isDashboardGradient = Boolean(gradientColors) || variant === 'gold' || variant === 'obsidian' || variant === 'glow';

  const defaultGradientColors = (): [string, string, ...string[]] => {
    switch (variant) {
      case 'gold':
        return ['#4A3728', '#695030', '#8B6840'];
      case 'obsidian':
        return ['#1C1713', '#2A221C', '#3D3126'];
      case 'glow':
      default:
        return ['#FFFFFF', '#FDF5E6', '#F3E4CA'];
    }
  };

  const containerStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'interactive' && styles.interactive,
    variant === 'flat' && styles.flat,
    variant === 'glow' && styles.glow,
    variant === 'champagne' && styles.champagne,
    variant === 'gold' && styles.gold,
    variant === 'obsidian' && styles.obsidian,
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
    style,
  ];

  const content = isDashboardGradient ? (
    <LinearGradient
      colors={gradientColors || defaultGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.innerFill, { padding }]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={[styles.innerFill, { padding }]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.84} style={containerStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    backgroundColor: '#F5F2EC',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    overflow: 'hidden',
    boxShadow: '0px 4px 14px rgba(105, 80, 48, 0.06)',
  } as any,
  innerFill: {
    width: '100%',
    height: '100%',
  },
  champagne: {
    backgroundColor: '#F5F2EC',
    borderColor: 'rgba(184, 144, 71, 0.22)',
  },
  gold: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    boxShadow: '0px 10px 24px rgba(74, 55, 40, 0.18)',
  } as any,
  obsidian: {
    borderColor: 'rgba(184, 144, 71, 0.45)',
    boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.3)',
  } as any,
  elevated: {
    backgroundColor: '#F5F2EC',
    borderColor: 'rgba(184, 144, 71, 0.22)',
    boxShadow: '0px 6px 18px rgba(105, 80, 48, 0.08)',
  } as any,
  interactive: {
    backgroundColor: '#F5F2EC',
    borderColor: 'rgba(184, 144, 71, 0.28)',
    boxShadow: '0px 6px 18px rgba(105, 80, 48, 0.08)',
  } as any,
  flat: {
    backgroundColor: '#FAF8F5',
    borderColor: 'rgba(184, 144, 71, 0.18)',
    boxShadow: '0px 2px 8px rgba(105, 80, 48, 0.04)',
  } as any,
  glow: {
    borderColor: 'rgba(212, 175, 55, 0.55)',
    boxShadow: '0px 10px 28px rgba(139, 104, 64, 0.2)',
  } as any,
});
