import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../src/stores/authStore';
import {
  usePendingDprs, usePendingLeave, usePendingMaterialRequests, usePendingAdvances,
  useApproveDpr, useRejectDpr, useDecideLeave, useDecideMaterial, useDecideAdvance,
} from '../../src/hooks/useApprovals';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

type FilterType = 'all' | 'dpr' | 'leave' | 'material' | 'advance';

const FILTER_TABS: { label: string; value: FilterType; color: string }[] = [
  { label: 'All', value: 'all', color: '#695030' },
  { label: 'DPR', value: 'dpr', color: '#2563EB' },
  { label: 'Leave', value: 'leave', color: '#D97706' },
  { label: 'Material', value: 'material', color: '#7C3AED' },
  { label: 'Advance', value: 'advance', color: '#059669' },
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

  const total = (dprs?.length || 0) + (leaves?.length || 0) + (materials?.length || 0) + (advances?.length || 0);

  const handleApproveDpr = (id: string) => {
    showAlert('Approve DPR', 'Approve this daily progress report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approveDpr.mutate({ dprId: id, reviewerId: profile!.id }) },
    ]);
  };

  const handleRejectDpr = (id: string) => {
    showAlert('Reject DPR', 'This report will be sent back for revision.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectDpr.mutate({ dprId: id, reviewerId: profile!.id, note: 'Rejected by admin' }) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>Review</Text>
            <Text style={styles.headerTitle}>Approvals</Text>
          </View>
          {total > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalCount}>{total}</Text>
              <Text style={styles.totalLabel}>Pending</Text>
            </View>
          )}
        </View>

        {/* Counts row */}
        <View style={styles.countsRow}>
          <CountChip label="DPR" count={dprs?.length || 0} color="#2563EB" />
          <CountChip label="Leave" count={leaves?.length || 0} color="#D97706" />
          <CountChip label="Material" count={materials?.length || 0} color="#7C3AED" />
          <CountChip label="Advance" count={advances?.length || 0} color="#059669" />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      >
        {FILTER_TABS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && { backgroundColor: f.color, borderColor: f.color }]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.warning} />}
      >
        {/* DPRs */}
        {(filter === 'all' || filter === 'dpr') && (dprs || []).map((dpr) => (
          <View key={dpr.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="document-text" size={16} color="#2563EB" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>DPR Report</Text>
                <Text style={styles.cardDate}>{new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
            <Text style={styles.cardBody}>{dpr.work_done}</Text>
            {dpr.work_type && <Text style={styles.cardMeta}>Type: {dpr.work_type}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectDpr(dpr.id)}>
                <Ionicons name="close" size={15} color={colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveDpr(dpr.id)}>
                <View style={styles.approveBtnBg}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Leave */}
        {(filter === 'all' || filter === 'leave') && (leaves || []).map((leave) => (
          <View key={leave.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar" size={16} color="#D97706" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Leave Request</Text>
                <Text style={styles.cardDate}>
                  {new Date(leave.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' → '}
                  {new Date(leave.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
            {leave.reason && <Text style={styles.cardBody}>{leave.reason}</Text>}
            <Text style={styles.cardMeta}>Type: {leave.type}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => decideLeave.mutate({ id: leave.id, status: 'rejected', decidedBy: profile!.id })}>
                <Ionicons name="close" size={15} color={colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => decideLeave.mutate({ id: leave.id, status: 'approved', decidedBy: profile!.id })}>
                <View style={styles.approveBtnBg}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Material */}
        {(filter === 'all' || filter === 'material') && (materials || []).map((mat) => (
          <View key={mat.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="cube" size={16} color="#7C3AED" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{mat.material_name}</Text>
                <Text style={styles.cardDate}>Qty: {mat.qty}{mat.needed_by ? ` · By ${new Date(mat.needed_by).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
            {mat.notes && <Text style={styles.cardBody}>{mat.notes}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => decideMaterial.mutate({ id: mat.id, status: 'rejected' })}>
                <Ionicons name="close" size={15} color={colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => decideMaterial.mutate({ id: mat.id, status: 'approved' })}>
                <View style={styles.approveBtnBg}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Advance */}
        {(filter === 'all' || filter === 'advance') && (advances || []).map((adv) => (
          <View key={adv.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cash" size={16} color="#059669" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Advance Request</Text>
                <Text style={styles.cardDate}>₹{adv.amount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
            {adv.reason && <Text style={styles.cardBody}>{adv.reason}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => decideAdvance.mutate({ id: adv.id, status: 'rejected', decidedBy: profile!.id })}>
                <Ionicons name="close" size={15} color={colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => decideAdvance.mutate({ id: adv.id, status: 'approved', decidedBy: profile!.id })}>
                <View style={styles.approveBtnBg}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {total === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No pending approvals at this time.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CountChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.countChip}>
      <Text style={[styles.countNum, { color }]}>{count}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  totalBadge: { backgroundColor: '#F9F6F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' },
  totalCount: { fontSize: 22, color: '#695030', fontFamily: fontFamily.bold },
  totalLabel: { fontSize: 10, color: '#695030', fontFamily: fontFamily.medium },
  countsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  countChip: { flex: 1, alignItems: 'center' },
  countNum: { fontSize: 18, fontFamily: fontFamily.bold },
  countLabel: { fontSize: 10, color: '#666', fontFamily: fontFamily.medium, marginTop: 2, textTransform: 'uppercase' },

  // Filters
  filterRow: { flexGrow: 0, paddingVertical: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(105,80,48,0.15)', boxShadow: '0px 2px 6px rgba(0,0,0,0.03)' } as any,
  filterText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.neutral[600] },
  filterTextActive: { color: '#fff' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md, paddingTop: spacing.xs },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)',
  } as any,
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  cardDate: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  pendingBadge: { backgroundColor: '#F9F6F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pendingText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#695030' },
  cardBody: { fontSize: 13, color: colors.neutral[700], marginBottom: spacing.sm, lineHeight: 19 },
  cardMeta: { fontSize: 11, color: colors.neutral[400], marginBottom: spacing.md },

  // Actions
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '30', backgroundColor: '#FEF2F2' },
  rejectText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.error },
  approveBtn: { borderRadius: 12, overflow: 'hidden' },
  approveBtnBg: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: '#059669' },
  approveText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: '#fff' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(5,150,105,0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#059669' },
  emptyText: { fontSize: 14, color: colors.neutral[400], textAlign: 'center' },
});
