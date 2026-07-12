/**
 * RetryBanner — Shows a non-intrusive banner when a query fails,
 * with a Retry button. Handles common error patterns gracefully.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface RetryBannerProps {
  message?: string;
  onRetry: () => void;
  style?: ViewStyle;
}

export function RetryBanner({ message = 'Failed to load data', onRetry, style }: RetryBannerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.error} />
        <Text style={styles.message}>{message}</Text>
      </View>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.7} hitSlop={8}>
        <Ionicons name="refresh" size={16} color={colors.white} />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Wraps a query result: shows retry banner if error, empty state if no data, children otherwise */
interface QueryGuardProps {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  data: any;
  loadingComponent: React.ReactNode;
  emptyComponent: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function QueryGuard({
  isLoading,
  isError,
  refetch,
  data,
  loadingComponent,
  emptyComponent,
  children,
  style,
}: QueryGuardProps) {
  if (isLoading) return <>{loadingComponent}</>;
  if (isError) return <RetryBanner onRetry={refetch} style={style} />;
  const isEmpty = !data || (Array.isArray(data) && data.length === 0);
  if (isEmpty) return <>{emptyComponent}</>;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  message: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  retryText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
});
