import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type BannerTone = 'success' | 'warning' | 'error' | 'info';

const META: Record<BannerTone, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle-outline', color: colors.success, bg: colors.successBg },
  warning: { icon: 'warning-outline', color: colors.warning, bg: colors.warningBg },
  error: { icon: 'alert-circle-outline', color: colors.error, bg: colors.errorBg },
  info: { icon: 'information-circle-outline', color: colors.info, bg: colors.infoBg },
};

interface BannerProps {
  tone?: BannerTone;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Banner({ tone = 'info', title, body, actionLabel, onAction }: BannerProps) {
  const meta = META[tone];
  return (
    <View style={{ ...styles.container, backgroundColor: meta.bg, borderColor: `${meta.color}33` }}>
      <Ionicons name={meta.icon} size={22} color={meta.color} />
      <View style={styles.copy}>
        <Text style={{ ...styles.title, color: meta.color }}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={{ ...styles.action, color: meta.color }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  copy: { flex: 1 },
  title: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  body: { ...typography.caption, color: colors.neutral[600], marginTop: spacing.xs },
  action: { ...typography.caption, fontFamily: fontFamily.semiBold },
});
