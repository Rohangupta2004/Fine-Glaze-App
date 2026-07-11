/**
 * Audit Log Viewer — Admin
 * PRD §29d — Every significant action tracked, filterable per project/employee.
 */
import React, { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';

import { Card } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  dpr_submit: { icon: 'document-text', color: colors.info },
  dpr_approve: { icon: 'checkmark-circle', color: colors.success },
  dpr_reject: { icon: 'close-circle', color: colors.error },
  leave_approve: { icon: 'calendar', color: colors.success },
  leave_reject: { icon: 'calendar', color: colors.error },
  payment_update: { icon: 'cash', color: colors.warning },
  document_upload: { icon: 'cloud-upload', color: colors.info },
  employee_create: { icon: 'person-add', color: colors.primary },
  attendance_punch: { icon: 'finger-print', color: colors.success },
  client_approve: { icon: 'shield-checkmark', color: colors.success },
  client_reject: { icon: 'shield', color: colors.error },
  material_approve: { icon: 'cube', color: colors.success },
};

function getActionMeta(action: string) {
  return ACTION_ICONS[action] || { icon: 'ellipse', color: colors.neutral[500] };
}

function useAuditLog(limit = 50) {
  return useQuery({
    queryKey: ['audit-log', limit],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      if (!logs || logs.length === 0) return [];

      // Fetch actor names
      const actorIds = [...new Set(logs.map((l: any) => l.actor_id).filter(Boolean))];
      const { data: profiles } = actorIds.length > 0
        ? await supabase.from('profiles').select('id,full_name').in('id', actorIds)
        : { data: [] };
      const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

      return logs.map((log: any) => ({
        ...log,
        actor_name: nameMap.get(log.actor_id) || 'System',
      }));
    },
  });
}

export default function AuditLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: logs, refetch, isRefetching } = useAuditLog();

  // Group by date
  const grouped = (logs || []).reduce((acc: Record<string, any[]>, log: any) => {
    const date = log.created_at?.slice(0, 10) || 'unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Audit Log</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {Object.entries(grouped).map(([date, entries]) => (
          <View key={date}>
            <Text style={styles.dateLabel}>
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {(entries as any[]).map((log) => {
              const meta = getActionMeta(log.action);
              return (
                <View key={log.id} style={styles.logRow}>
                  <View style={styles.timeline}>
                    <View style={[styles.timelineDot, { backgroundColor: meta.color }]}>
                      <Ionicons name={meta.icon as any} size={14} color={colors.white} />
                    </View>
                    <View style={styles.timelineLine} />
                  </View>
                  <Card style={styles.logCard} variant="flat">
                    <Text style={styles.logAction}>{log.action.replace(/_/g, ' ')}</Text>
                    <Text style={styles.logActor}>{log.actor_name}</Text>
                    {log.detail && (
                      <Text style={styles.logDetail} numberOfLines={2}>
                        {typeof log.detail === 'object' ? JSON.stringify(log.detail) : log.detail}
                      </Text>
                    )}
                    <Text style={styles.logTime}>
                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Card>
                </View>
              );
            })}
          </View>
        ))}

        {(!logs || logs.length === 0) && (
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No audit log entries yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { ...typography.h4, color: colors.ink },
  dateLabel: { ...typography.h6, color: colors.neutral[500], marginBottom: spacing.md, marginTop: spacing.lg },
  logRow: { flexDirection: 'row', marginBottom: spacing.sm },
  timeline: { width: 32, alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: -2 },
  logCard: { flex: 1, marginLeft: spacing.sm, padding: spacing.md, backgroundColor: colors.neutral[100] },
  logAction: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink, textTransform: 'capitalize' },
  logActor: { ...typography.caption, color: colors.primary, marginTop: 2 },
  logDetail: { ...typography.caption, color: colors.neutral[600], marginTop: 4 },
  logTime: { ...typography.caption, color: colors.neutral[400], marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
