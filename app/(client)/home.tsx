import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatusChip } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useAllPayments } from '../../src/hooks/usePayments';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function ClientDashboard() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Client';
  const { data: projects, refetch, isRefetching } = useProjects();
  const { data: payments } = useAllPayments();
  const project = (projects || [])[0];

  const totalBilled = (payments || []).reduce((s, p) => s + p.amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.greeting}>Welcome, {firstName} 👋</Text>

      {project ? (
        <>
          {/* Project Progress */}
          <Card style={styles.projectCard}>
            <View style={styles.projectHeader}>
              <View>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectMeta}>{project.city} · {project.type}</Text>
              </View>
              <StatusChip status={project.status} />
            </View>

            {/* Progress Ring */}
            <View style={styles.progressSection}>
              <View style={styles.ring}>
                <Text style={styles.ringPct}>{project.progress_pct}%</Text>
                <Text style={styles.ringLabel}>Complete</Text>
              </View>
              <View style={styles.progressDetails}>
                <DetailRow icon="layers" label="Stage" value={project.stage || '—'} />
                <DetailRow icon="calendar" label="Start" value={project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                <DetailRow icon="flag" label="Expected End" value={project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
              </View>
            </View>
          </Card>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Ionicons name="trending-up" size={22} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.success }]}>{project.progress_pct}%</Text>
              <Text style={styles.statLabel}>Progress</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="cash" size={22} color={colors.info} />
              <Text style={[styles.statValue, { color: colors.info }]}>{paidPct}%</Text>
              <Text style={styles.statLabel}>Paid</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="documents" size={22} color={colors.pending} />
              <Text style={[styles.statValue, { color: colors.pending }]}>{(payments || []).length}</Text>
              <Text style={styles.statLabel}>Milestones</Text>
            </Card>
          </View>

          {/* Payment Summary */}
          <Card style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>💰 Payment Overview</Text>
            <View style={styles.paymentRow}>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Total Billed</Text>
                <Text style={styles.paymentValue}>₹{totalBilled.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Paid</Text>
                <Text style={[styles.paymentValue, { color: colors.success }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Pending</Text>
                <Text style={[styles.paymentValue, { color: colors.warning }]}>₹{(totalBilled - totalPaid).toLocaleString('en-IN')}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
            </View>
          </Card>
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="business-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyText}>No projects assigned yet</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.neutral[400]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  greeting: { ...typography.h4, color: colors.ink, marginBottom: spacing['2xl'] },
  projectCard: { padding: spacing.xl, marginBottom: spacing.lg },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  projectName: { ...typography.h5, color: colors.ink },
  projectMeta: { ...typography.bodySmall, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  progressSection: { flexDirection: 'row', gap: spacing.xl },
  ring: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 6, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ringPct: { ...typography.h3, color: colors.primary },
  ringLabel: { ...typography.caption, color: colors.neutral[500] },
  progressDetails: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel: { ...typography.caption, color: colors.neutral[400], width: 70 },
  detailValue: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, flex: 1, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.h4 },
  statLabel: { ...typography.caption, color: colors.neutral[500] },
  paymentCard: { padding: spacing.xl },
  sectionTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.lg },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  paymentItem: { alignItems: 'center' },
  paymentLabel: { ...typography.caption, color: colors.neutral[500], marginBottom: spacing.xs },
  paymentValue: { ...typography.h6, color: colors.ink },
  progressTrack: { height: 8, backgroundColor: colors.neutral[100], borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: colors.success, borderRadius: 4 },
  emptyCard: { padding: spacing['4xl'], alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
