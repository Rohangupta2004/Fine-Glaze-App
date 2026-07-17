import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../src/stores/authStore';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../src/hooks/useNotifications';
import type { Notification as AppNotification } from '../../src/types';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

const KIND_ICON: Record<string, { icon: string; colors: string[] }> = {
  task_assigned: { icon: 'list', colors: ['#3B82F6', '#2563EB'] },
  dpr_approved: { icon: 'checkmark-circle', colors: ['#10B981', '#059669'] },
  dpr_rejected: { icon: 'close-circle', colors: ['#EF4444', '#DC2626'] },
  leave_approved: { icon: 'calendar', colors: ['#10B981', '#059669'] },
  leave_rejected: { icon: 'calendar', colors: ['#EF4444', '#DC2626'] },
  material_delivered: { icon: 'cube', colors: ['#8B5CF6', '#7C3AED'] },
  payment_received: { icon: 'cash', colors: ['#10B981', '#059669'] },
  approval_pending: { icon: 'time', colors: ['#F59E0B', '#D97706'] },
  default: { icon: 'notifications', colors: ['#695030', '#918050'] },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: notifications, refetch, isRefetching } = useNotifications(profile?.id);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = (notifications || []).filter((n) => !n.read_at);

  const handleTap = (notif: AppNotification) => {
    if (!notif.read_at) {
      markRead.mutate(notif.id);
    }
  };

  const grouped = (notifications || []).reduce((acc, n) => {
    const dateStr = n.created_at
      ? new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Unknown';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(n);
    return acc;
  }, {} as Record<string, typeof notifications>);

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>Alerts</Text>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          {unread.length > 0 && (
            <TouchableOpacity onPress={() => markAllRead.mutate(profile!.id)} style={styles.markAllBtn}>
              <Ionicons name="checkmark-done" size={16} color="#695030" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {unread.length > 0 && (
          <View style={styles.unreadBadgeRow}>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeNum}>{unread.length}</Text>
              <Text style={styles.unreadBadgeLabel}>New {unread.length === 1 ? 'Alert' : 'Alerts'}</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#695030" />}
      >
        {Object.entries(grouped).map(([date, notifs]) => (
          <View key={date} style={styles.dateSection}>
            <View style={styles.dateHeader}>
              <View style={styles.dateDot} />
              <Text style={styles.dateLabel}>{date}</Text>
            </View>
            
            {(notifs || []).map((notif) => {
              const meta = KIND_ICON[notif.kind] || KIND_ICON.default;
              const isUnread = !notif.read_at;
              
              return (
                <TouchableOpacity key={notif.id} activeOpacity={0.8} onPress={() => handleTap(notif)}>
                  <View style={[styles.notifCard, isUnread && styles.notifCardUnread]}>
                    <View style={styles.notifRow}>
                      <LinearGradient colors={meta.colors as any} style={styles.notifIcon}>
                        <Ionicons name={meta.icon as any} size={18} color="#fff" />
                      </LinearGradient>
                      
                      <View style={styles.notifContent}>
                        <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}>{notif.title}</Text>
                        <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                        <Text style={styles.notifTime}>
                          {notif.created_at ? new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {(!notifications || notifications.length === 0) && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="notifications-outline" size={40} color="#695030" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>You have no notifications right now.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  markAllText: { fontSize: 12, fontFamily: fontFamily.semiBold, color: '#695030' },

  unreadBadgeRow: { flexDirection: 'row', marginTop: spacing.xs },
  unreadBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  unreadBadgeNum: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  unreadBadgeLabel: { fontSize: 12, fontFamily: fontFamily.medium, color: '#666' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.md },
  
  // Date Section
  dateSection: { marginBottom: spacing.lg },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, marginLeft: 4 },
  dateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neutral[400] },
  dateLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 16px rgba(0,0,0,0.03)',
  } as any,
  notifCardUnread: {
    backgroundColor: '#fff',
    borderColor: '#695030',
    borderWidth: 1.5,
    boxShadow: '0px 4px 16px rgba(105,80,48,0.08)',
  } as any,
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  notifIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontFamily: fontFamily.medium, color: '#1E1815' },
  notifTitleUnread: { fontFamily: fontFamily.bold },
  notifBody: { fontSize: 13, color: colors.neutral[500], marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.neutral[400], marginTop: 6, fontFamily: fontFamily.medium },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: spacing.xs },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(105,80,48,0.05)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 14, color: colors.neutral[400], textAlign: 'center' },
});
