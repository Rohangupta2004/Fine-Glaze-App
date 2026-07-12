import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type ChipStatus =
  | 'on_track'
  | 'in_progress'
  | 'pending'
  | 'delayed'
  | 'approved'
  | 'rejected'
  | 'submitted'
  | 'draft'
  | 'present'
  | 'absent'
  | 'leave'
  | 'half_day'
  | 'at_risk'
  | 'completed'
  | 'active'
  | 'on_leave'
  | 'on_hold'
  | 'inactive';

interface StatusChipProps {
  status: ChipStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<ChipStatus, { bg: string; text: string; label: string }> = {
  on_track: { bg: colors.successBg, text: colors.success, label: 'On Track' },
  in_progress: { bg: colors.infoBg, text: colors.info, label: 'In Progress' },
  pending: { bg: colors.pendingBg, text: colors.pending, label: 'Pending' },
  delayed: { bg: colors.errorBg, text: colors.error, label: 'Delayed' },
  approved: { bg: colors.successBg, text: colors.success, label: 'Approved' },
  rejected: { bg: colors.errorBg, text: colors.error, label: 'Rejected' },
  submitted: { bg: colors.infoBg, text: colors.info, label: 'Submitted' },
  draft: { bg: colors.neutral[100], text: colors.neutral[600], label: 'Draft' },
  present: { bg: colors.successBg, text: colors.success, label: 'Present' },
  absent: { bg: colors.errorBg, text: colors.error, label: 'Absent' },
  leave: { bg: colors.warningBg, text: colors.warning, label: 'Leave' },
  half_day: { bg: colors.pendingBg, text: colors.pending, label: 'Half Day' },
  at_risk: { bg: colors.warningBg, text: colors.warning, label: 'At Risk' },
  completed: { bg: colors.successBg, text: colors.success, label: 'Completed' },
  active: { bg: colors.successBg, text: colors.success, label: 'Active' },
  on_leave: { bg: colors.warningBg, text: colors.warning, label: 'On Leave' },
  on_hold: { bg: colors.pendingBg, text: colors.pending, label: 'On Hold' },
  inactive: { bg: colors.neutral[100], text: colors.neutral[600], label: 'Inactive' },
};

export function StatusChip({ status, label, size = 'md' }: StatusChipProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: config.bg },
        size === 'sm' && styles.chipSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text
        style={[
          styles.label,
          { color: config.text },
          size === 'sm' && styles.labelSm,
        ]}
      >
        {label ?? config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  chipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
    lineHeight: 12,
  },
});
