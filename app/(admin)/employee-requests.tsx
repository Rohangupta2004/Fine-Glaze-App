import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import {
  useAllEmployeeRequests,
  useDecideEmployeeRequest,
} from '../../src/hooks/useEmployeeRequests';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../../src/theme/spacing';
import type { EmployeeRequestStatus } from '../../src/types';

const STATUS_META: Record<EmployeeRequestStatus, { color: string; bg: string; label: string }> = {
  pending: { color: colors.warning, bg: colors.warningBg, label: 'Pending' },
  approved: { color: colors.success, bg: colors.successBg, label: 'Approved' },
  rejected: { color: colors.error, bg: colors.errorBg, label: 'Rejected' },
};

export default function EmployeeRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: requests, refetch, isRefetching } = useAllEmployeeRequests();
  const { data: projects } = useProjects();
  const decide = useDecideEmployeeRequest();

  const projectName = useMemo(
    () => new Map((projects || []).map((p: any) => [p.id, p.name])),
    [projects],
  );

  const handleDecide = (id: string, status: 'approved' | 'rejected') => {
    if (!profile?.id) return;
    decide.mutate(
      { id, status, decidedBy: profile.id },
      { onError: (e: any) => Alert.alert('Failed', e?.message || 'Please try again.') },
    );
  };

  const pending = (requests || []).filter((r) => r.status === 'pending');
  const decided = (requests || []).filter((r) => r.status !== 'pending');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Employee Requests</Text>
        <View style={{ width: TOUCH_TARGET }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {(!requests || requests.length === 0) && (
          <View style={styles.empty}>
            <Ionicons name="person-add-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No employee requests from supervisors yet</Text>
          </View>
        )}

        {pending.length > 0 && <Text style={styles.groupLabel}>PENDING ({pending.length})</Text>}
        {pending.map((req) => (
          <Card key={req.id} style={styles.reqCard} padding={spacing.md}>
            <View style={styles.reqRow}>
              <View style={styles.reqIcon}>
                <Ionicons name="person-add" size={20} color={colors.primary} />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqTitle}>{req.headcount} × {req.role_needed}</Text>
                <Text style={styles.reqMeta}>
                  {projectName.get(req.project_id) || 'Site'} · {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
                {req.notes && <Text style={styles.reqNotes}>{req.notes}</Text>}
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.error }]} onPress={() => handleDecide(req.id, 'rejected')}>
                <Ionicons name="close" size={16} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success, borderColor: colors.success }]} onPress={() => handleDecide(req.id, 'approved')}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {decided.length > 0 && <Text style={styles.groupLabel}>DECIDED</Text>}
        {decided.map((req) => {
          const meta = STATUS_META[req.status];
          return (
            <Card key={req.id} style={styles.reqCard} padding={spacing.md}>
              <View style={styles.reqRow}>
                <View style={styles.reqIcon}>
                  <Ionicons name="person-add" size={20} color={colors.neutral[400]} />
                </View>
                <View style={styles.reqInfo}>
                  <Text style={styles.reqTitle}>{req.headcount} × {req.role_needed}</Text>
                  <Text style={styles.reqMeta}>{projectName.get(req.project_id) || 'Site'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[200], backgroundColor: colors.surface,
  },
  backBtn: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-start', justifyContent: 'center' },
  title: { ...typography.h5, color: colors.ink },
  list: { padding: spacing.lg, paddingBottom: spacing['6xl'] },
  groupLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400], textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },
  reqCard: { marginBottom: spacing.sm },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reqIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  reqInfo: { flex: 1 },
  reqTitle: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink, textTransform: 'capitalize' },
  reqMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  reqNotes: { ...typography.caption, color: colors.neutral[400], marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, alignSelf: 'flex-start' },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  actionText: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400], textAlign: 'center' },
});
