/**
 * SyncStatusBadge.tsx
 *
 * A small visual indicator that shows:
 *   • A spinning/clock icon with count when items are pending sync.
 *   • A green "Synced" chip when everything is uploaded.
 *
 * Usage:
 *   <SyncStatusBadge />
 *
 * The component reads directly from the outbox Zustand store, so no props
 * are required.  Drop it into any screen header or home card.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOutboxPending } from '../hooks/useOutboxPending';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export function SyncStatusBadge(): React.JSX.Element {
  const { unsyncedCount, isSyncing } = useOutboxPending();

  if (unsyncedCount === 0 && !isSyncing) {
    return (
      <View style={[styles.badge, styles.synced]}>
        <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
        <Text style={[styles.label, { color: colors.success }]}>Synced</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.pending]}>
      {isSyncing ? (
        <ActivityIndicator size="small" color={colors.warning} style={{ marginRight: 4 }} />
      ) : (
        <Ionicons name="time-outline" size={14} color={colors.warning} />
      )}
      <Text style={[styles.label, { color: colors.warning }]}>
        {isSyncing ? 'Syncing…' : `${unsyncedCount} pending`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full ?? 999,
  },
  synced: {
    backgroundColor: '#E8F5E9',
  },
  pending: {
    backgroundColor: '#FFF8E1',
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
});
