/**
 * EmptyState — Designed empty state for lists and screens.
 * Consistent appearance across the app — icon + message + optional CTA.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export function EmptyState({
  icon = 'folder-open-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
        <Ionicons name={icon as any} size={compact ? 32 : 48} color={colors.neutral[300]} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Pre-configured empty states for common scenarios */
export const emptyStates = {
  projects: {
    icon: 'business-outline',
    title: 'No projects yet',
    message: 'Create your first project to get started',
  },
  employees: {
    icon: 'people-outline',
    title: 'No employees',
    message: 'Add team members to manage your workforce',
  },
  clients: {
    icon: 'briefcase-outline',
    title: 'No clients',
    message: 'Add client companies and give them app access',
  },
  materials: {
    icon: 'cube-outline',
    title: 'No materials',
    message: 'Material requests and stock will appear here',
  },
  documents: {
    icon: 'document-outline',
    title: 'No documents',
    message: 'Upload documents to organize your files',
  },
  messages: {
    icon: 'chatbubbles-outline',
    title: 'No conversations',
    message: 'Start a chat with your team or clients',
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'No notifications',
    message: 'You\'re all caught up!',
  },
  tasks: {
    icon: 'checkbox-outline',
    title: 'No tasks',
    message: 'Tasks assigned to you will appear here',
  },
  search: {
    icon: 'search-outline',
    title: 'No results found',
    message: 'Try a different search term',
  },
  attendance: {
    icon: 'finger-print-outline',
    title: 'No attendance records',
    message: 'Attendance logs will appear here',
  },
  deliveries: {
    icon: 'car-outline',
    title: 'No deliveries',
    message: 'Material deliveries will appear here',
  },
  approvals: {
    icon: 'checkmark-circle-outline',
    title: 'Nothing to approve',
    message: 'All caught up — no pending approvals',
  },
} as const;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['3xl'],
  },
  compact: {
    paddingVertical: spacing['2xl'],
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconWrapCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h5,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  titleCompact: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
  },
  message: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    maxWidth: 240,
  },
  actionBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
