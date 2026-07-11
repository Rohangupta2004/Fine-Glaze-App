import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import {
  usePendingDprs,
  usePendingLeave,
  usePendingMaterialRequests,
  usePendingAdvances,
  useApproveDpr,
  useRejectDpr,
  useDecideLeave,
  useDecideMaterial,
  useDecideAdvance,
} from '../../src/hooks/useApprovals';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

type FilterType = 'all' | 'dpr' | 'leave' | 'material' | 'advance';

const FILTER_TABS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'DPR', value: 'dpr' },
  { label: 'Leave', value: 'leave' },
  { label: 'Material', value: 'material' },
  { label: 'Advance', value: 'advance' },
];

export default function ApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: dprs, refetch: rDprs, isRefetching: r1 } = usePendingDprs();
  const { data: leaves, refetch: rLeaves, isRefetching: r2 } = usePendingLeave();
  const { data: materials, refetch: rMats, isRefetching: r3 } = usePendingMaterialRequests();
  const { data: advances, refetch: rAdv, isRefetching: r4 } = usePendingAdvances();

  const approveDpr = useApproveDpr();
  const rejectDpr = useRejectDpr();
  const decideLeave = useDecideLeave();
  const decideMaterial = useDecideMaterial();
  const decideAdvance = useDecideAdvance();

  const onRefresh = () => { rDprs(); rLeaves(); rMats(); rAdv(); };
  const isRefreshing = r1 || r2 || r3 || r4;

  const handleApproveDpr = (id: string) => {
    Alert.alert('Approve DPR', 'Approve this daily progress report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approveDpr.mutate({ dprId: id, reviewerId: profile!.id }) },
    ]);
  };

  const handleRejectDpr = (id: string) => {
    Alert.alert('Reject DPR', 'This report will be sent back for revision.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectDpr.mutate({ dprId: id, reviewerId: profile!.id, note: 'Rejected by admin' }) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Approvals</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: spacing.sm }}>
        {FILTER_TABS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* DPRs */}
        {(filter === 'all' || filter === 'dpr') && (dprs || []).map((dpr) => (
          <Card key={dpr.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: colors.infoBg }]}>
                <Ionicons name="document-text" size={18} color={colors.info} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>DPR Report</Text>
                <Text style={styles.cardDate}>{new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
              </View>
            </View>
            <Text style={styles.cardBody}>{dpr.work_done}</Text>
            {dpr.work_type && <Text style={styles.cardMeta}>Type: {dpr.work_type}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectDpr(dpr.id)}>
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveDpr(dpr.id)}>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Leave */}
        {(filter === 'all' || filter === 'leave') && (leaves || []).map((leave) => (
          <Card key={leave.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="calendar" size={18} color={colors.warning} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Leave Request</Text>
                <Text style={styles.cardDate}>
                  {new Date(leave.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' → '}
                  {new Date(leave.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
              </View>
            </View>
            {leave.reason && <Text style={styles.cardBody}>{leave.reason}</Text>}
            <Text style={styles.cardMeta}>Type: {leave.type}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => decideLeave.mutate({ id: leave.id, status: 'rejected', decidedBy: profile!.id })}>
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => decideLeave.mutate({ id: leave.id, status: 'approved', decidedBy: profile!.id })}>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Material */}
        {(filter === 'all' || filter === 'material') && (materials || []).map((mat) => (
          <Card key={mat.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: colors.pendingBg }]}>
                <Ionicons name="cube" size={18} color={colors.pending} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{mat.material_name}</Text>
                <Text style={styles.cardDate}>Qty: {mat.qty}{mat.needed_by ? ` · By ${new Date(mat.needed_by).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
              </View>
            </View>
            {mat.notes && <Text style={styles.cardBody}>{mat.notes}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => decideMaterial.mutate({ id: mat.id, status: 'rejected' })}>
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => decideMaterial.mutate({ id: mat.id, status: 'approved' })}>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Advance */}
        {(filter === 'all' || filter === 'advance') && (advances || []).map((adv) => (
          <Card key={adv.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: colors.successBg }]}>
                <Ionicons name="cash" size={18} color={colors.success} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Advance Request</Text>
                <Text style={styles.cardDate}>₹{adv.amount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
              </View>
            </View>
            {adv.reason && <Text style={styles.cardBody}>{adv.reason}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => decideAdvance.mutate({ id: adv.id, status: 'rejected', decidedBy: profile!.id })}>
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => decideAdvance.mutate({ id: adv.id, status: 'approved', decidedBy: profile!.id })}>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Empty state */}
        {(dprs?.length || 0) + (leaves?.length || 0) + (materials?.length || 0) + (advances?.length || 0) === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
            <Text style={styles.emptyText}>All caught up! No pending approvals.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { ...typography.h4, color: colors.ink },
  filterRow: { marginBottom: spacing.lg, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: colors.white },
  card: { padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { ...typography.h6, color: colors.ink },
  cardDate: { ...typography.caption, color: colors.neutral[500] },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold },
  cardBody: { ...typography.bodySmall, color: colors.neutral[700], marginBottom: spacing.sm },
  cardMeta: { ...typography.caption, color: colors.neutral[400], marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.error + '30',
    backgroundColor: colors.errorBg,
  },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.success,
  },
  actionText: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
