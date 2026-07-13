/**
 * StatusPill — Compact pill with colored dot + label.
 *
 * Universal replacement for inline status badges. Uses semantic colors
 * from the theme.
 *
 * Props:
 *  - status: 'paid' | 'pending' | 'approved' | 'rejected' | 'ordered' | 'present' | 'absent' | 'leave' | 'done' | 'blocked' | 'draft'
 *  - label: optional override (defaults to capitalize(status))
 *  - size: 'sm' | 'md'
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type PillStatus =
  | 'paid' | 'pending' | 'approved' | 'rejected' | 'ordered'
  | 'present' | 'absent' | 'leave' | 'half_day'
  | 'done' | 'blocked' | 'draft' | 'submitted';

interface StatusPillProps {
  status: PillStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const COLOR_MAP: Record<PillStatus, { color: string; bg: string }> = {
  paid:       { color: colors.success, bg: colors.successBg },
  pending:    { color: colors.warning, bg: colors.warningBg },
  approved:   { color: colors.success, bg: colors.successBg },
  rejected:   { color: colors.error,   bg: colors.errorBg },
  ordered:    { color: colors.info,    bg: colors.infoBg },
  present:    { color: colors.success, bg: colors.successBg },
  absent:     { color: colors.error,   bg: colors.errorBg },
  leave:      { color: colors.warning, bg: colors.warningBg },
  half_day:   { color: colors.info,    bg: colors.infoBg },
  done:       { color: colors.success, bg: colors.successBg },
  blocked:    { color: colors.error,   bg: colors.errorBg },
  draft:      { color: colors.neutral[600], bg: colors.neutral[100] },
  submitted:  { color: colors.info,    bg: colors.infoBg },
};

export function StatusPill({ status, label, size = 'sm' }: StatusPillProps) {
  const cfg = COLOR_MAP[status] || COLOR_MAP.pending;
  const text = label || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  const isSm = size === 'sm';

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }, isSm && styles.pillSm]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }, isSm && styles.dotSm]} />
      <Text style={[styles.text, { color: cfg.color }, isSm && styles.textSm]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pillSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSm: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  textSm: {
    fontSize: 10,
  },
});
