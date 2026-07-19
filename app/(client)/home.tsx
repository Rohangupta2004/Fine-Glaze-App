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
import { LinearGradient } from 'expo-linear-gradient';

import { Card, StatusChip } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useAllPayments } from '../../src/hooks/usePayments';
import { useFacadeSections, useProjectVariations } from '../../src/hooks/useContractorFeatures';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';

export default function ClientDashboard() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Client';
  const { data: projects, refetch, isRefetching } = useProjects();
  const { data: payments } = useAllPayments();
  const project = (projects || [])[0];
  const { data: sections = [] } = useFacadeSections(project?.id);
  const { data: variations = [] } = useProjectVariations(project?.id);

  const totalBilled = (payments || []).reduce((s, p) => s + p.amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
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

          {/* Payment Summary — gradient hero */}
          <View style={styles.paymentHeroWrap}>
            <LinearGradient
              colors={['#695030', '#918050', '#C8B79C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.paymentHeroCard}
            >
              <View style={styles.paymentHeroGlow} pointerEvents="none" />

              <View style={styles.paymentHeroHeader}>
                <Ionicons name="cash" size={20} color={colors.white} />
                <Text style={styles.paymentHeroTitle}>Payment Overview</Text>
              </View>

              <View style={styles.paymentRow}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Total Billed</Text>
                  <Text style={styles.paymentValue}>₹{totalBilled.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Paid</Text>
                  <Text style={[styles.paymentValue, { color: '#BBF7D0' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Pending</Text>
                  <Text style={[styles.paymentValue, { color: '#FDE68A' }]}>₹{(totalBilled - totalPaid).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['#86EFAC', '#22C55E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${paidPct}%` }]}
                />
              </View>
              <Text style={styles.progressLabel}>{paidPct}% collected</Text>
            </LinearGradient>
          </View>

          {/* Elevation Progress Map */}
          {sections.length > 0 && (
            <Card style={{ padding: spacing.md, marginTop: spacing.md, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#EAE6DF' }}>
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 12 }}>
                Elevation Progress Map
              </Text>
              <View style={{ gap: 6 }}>
                {['L4', 'L3', 'L2', 'L1'].map(level => (
                  <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ width: 20, fontSize: 11, fontFamily: fontFamily.bold, color: colors.neutral[600] }}>{level}</Text>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                      {['BayA', 'BayB', 'BayC', 'BayD'].map(bay => {
                        const label = `${level}-${bay}`;
                        const sec = sections.find(s => s.label === label);
                        const statusColor = sec?.status === 'completed' ? '#16A34A' : (sec?.status === 'in_progress' ? '#CA8A04' : '#DC2626');
                        const statusBg = sec?.status === 'completed' ? 'rgba(22, 163, 74, 0.15)' : (sec?.status === 'in_progress' ? 'rgba(202, 138, 4, 0.15)' : 'rgba(220, 38, 38, 0.15)');
                        return (
                          <View
                            key={bay}
                            style={{
                              flex: 1,
                              height: 36,
                              backgroundColor: statusBg,
                              borderWidth: 1,
                              borderColor: statusColor,
                              borderRadius: 6,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: colors.neutral[700] }}>{bay.replace('Bay', '')}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="business-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyText}>No projects assigned yet</Text>
        </Card>
      )}
      </ScrollView>
    </View>
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
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.lg },
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
  paymentHeroWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  paymentHeroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  paymentHeroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  paymentHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentHeroTitle: {
    ...typography.h6,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  paymentItem: { alignItems: 'center', flex: 1 },
  paymentLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.78)',
    marginBottom: spacing.xs,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentValue: {
    ...typography.h6,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: radius.full,
  },
  progressLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
    textAlign: 'right',
    fontSize: 10,
  },
  emptyCard: { padding: spacing['4xl'], alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
