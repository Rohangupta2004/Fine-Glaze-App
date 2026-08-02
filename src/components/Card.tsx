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
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  } as any,
  innerFill: {
    width: '100%',
  },
  champagne: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  gold: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    shadowColor: '#4A3728',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  } as any,
  obsidian: {
    borderColor: 'rgba(184, 144, 71, 0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  } as any,
  elevated: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  } as any,
  interactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  } as any,
  flat: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  } as any,
  glow: {
    borderColor: 'rgba(212, 175, 55, 0.55)',
    shadowColor: '#8B6840',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 5,
  } as any,
});
