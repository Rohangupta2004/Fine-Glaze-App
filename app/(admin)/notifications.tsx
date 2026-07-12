import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, ListSkeleton, EmptyState, emptyStates } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../src/hooks/useNotifications';
import type { Notification as AppNotification } from '../../src/types';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const KIND_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  task_assigned: { icon: 'list', color: colors.info, bg: colors.infoBg },
  dpr_approved: { icon: 'checkmark-circle', color: colors.success, bg: colors.successBg },
  dpr_rejected: { icon: 'close-circle', color: colors.error, bg: colors.errorBg },
  leave_approved: { icon: 'calendar', color: colors.success, bg: colors.successBg },
  leave_rejected: { icon: 'calendar', color: colors.error, bg: colors.errorBg },
  material_delivered: { icon: 'cube', color: colors.pending, bg: colors.pendingBg },
  payment_received: { icon: 'cash', color: colors.success, bg: colors.successBg },
  approval_pending: { icon: 'time', color: colors.warning, bg: colors.warningBg },
  default: { icon: 'notifications', color: colors.primary, bg: colors.primary + '10' },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: notifications, refetch, isRefetching, isLoading } = useNotifications(profile?.id);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = (notifications || []).filter((n) => !n.read_at);

  const handleTap = (notif: AppNotification) => {
    if (!notif.read_at) {
      markRead.mutate(notif.id);
    }
  };

  // Group by date
  const grouped = (notifications || []).reduce((acc, n) => {
    const dateStr = n.created_at
      ? new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Unknown';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(n);
    return acc;
  }, {} as Record<string, typeof notifications>);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unread.length > 0 ? (
          <TouchableOpacity onPress={() => markAllRead.mutate(profile!.id)}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 80 }} />}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {Object.entries(grouped).map(([date, notifs]) => (
          <View key={date}>
            <Text style={styles.dateLabel}>{date}</Text>
            {(notifs || []).map((notif) => {
              const meta = KIND_ICON[notif.kind] || KIND_ICON.default;
              const isUnread = !notif.read_at;
              return (
                <TouchableOpacity key={notif.id} onPress={() => handleTap(notif)}>
                  <Card style={{ ...styles.notifCard, ...(isUnread ? styles.notifUnread : {}) }}>
                    <View style={styles.notifRow}>
                      <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                      </View>
                      <View style={styles.notifContent}>
                        <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}>{notif.title}</Text>
                        <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                      </View>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {isLoading ? (
          <ListSkeleton count={6} style={{ paddingHorizontal: spacing.sm }} />
        ) : (!notifications || notifications.length === 0) ? (
          <EmptyState {...emptyStates.notifications} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { ...typography.h4, color: colors.ink },
  markAll: { ...typography.bodySmall, color: colors.primary, fontFamily: fontFamily.medium },
  dateLabel: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  notifCard: { padding: spacing.md, marginBottom: spacing.sm },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  notifIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  notifTitleUnread: { fontFamily: fontFamily.semiBold },
  notifBody: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
