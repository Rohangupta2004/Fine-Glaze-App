/**
 * LoadingSkeleton — Animated shimmer placeholders for loading states.
 * Provides preset layouts: card, list, profile, stats.
 * Uses simple opacity animation (no native deps).
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** Single skeleton shape with shimmer animation */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.xs, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.neutral[200], opacity },
        style,
      ]}
    />
  );
}

/** Card skeleton (stat card, project card, etc.) */
export function CardSkeleton({ count = 1, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="70%" height={20} style={{ marginTop: spacing.sm }} />
          <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: spacing.md }} />
        </View>
      ))}
    </View>
  );
}

/** List item skeleton */
export function ListSkeleton({ count = 5, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={styles.listText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={12} style={{ marginTop: spacing.xs }} />
          </View>
          <Skeleton width={60} height={24} borderRadius={radius.sm} />
        </View>
      ))}
    </View>
  );
}

/** Stats row skeleton (3 stat cards) */
export function StatsSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.statsRow, style]}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.statCard}>
          <Skeleton width={24} height={24} borderRadius={12} />
          <Skeleton width={40} height={28} style={{ marginTop: spacing.sm }} />
          <Skeleton width={56} height={10} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

/** Full-screen loading with multiple sections */
export function ScreenSkeleton() {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <Skeleton width="50%" height={24} />
        <Skeleton width="70%" height={12} style={{ marginTop: spacing.sm }} />
      </View>
      <StatsSkeleton style={{ marginBottom: spacing.xl }} />
      <Skeleton width="30%" height={16} style={{ marginBottom: spacing.md }} />
      <CardSkeleton count={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  listText: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing['5xl'],
  },
  screenHeader: {
    marginBottom: spacing['2xl'],
  },
});
