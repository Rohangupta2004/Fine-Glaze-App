import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatusChip, Avatar } from '../../src/components';
import { useProject } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { useMyDprs } from '../../src/hooks/useDpr';
import { useProjectPayments } from '../../src/hooks/usePayments';
import { useMaterialRequests } from '../../src/hooks/useMaterials';
import { useDocuments } from '../../src/hooks/useDocuments';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { Payment, MaterialRequest, Dpr, DocumentRow } from '../../src/types';

const SECTIONS = ['Overview', 'Tasks', 'Team', 'DPR', 'Materials', 'Payments', 'Documents'] as const;
type Section = typeof SECTIONS[number];

export default function ProjectWorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, refetch, isRefetching } = useProject(id);
  const { data: employees } = useEmployees();
  const { data: payments } = useProjectPayments(id);
  const { data: materialReqs } = useMaterialRequests(id);
  const { data: documents } = useDocuments('project', id);
  const [section, setSection] = useState<Section>('Overview');

  if (!project) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading project...</Text>
      </View>
    );
  }

  const totalBilled = (payments || []).reduce((s, p) => s + p.amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingMaterials = (materialReqs || []).filter(m => m.status === 'pending');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
          <StatusChip status={project.status} />
        </View>
      </View>

      {/* Section Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sectionTabs}
        contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
      >
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sectionTab, section === s && styles.sectionTabActive]}
            onPress={() => setSection(s)}
          >
            <Text style={[styles.sectionTabText, section === s && styles.sectionTabTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Overview */}
        {section === 'Overview' && (
          <>
            {/* Progress Ring (simplified as bar) */}
            <Card style={styles.overviewCard}>
              <View style={styles.progressSection}>
                <View style={styles.progressRing}>
                  <Text style={styles.progressPct}>{project.progress_pct}%</Text>
                  <Text style={styles.progressLabel}>Complete</Text>
                </View>
                <View style={styles.progressDetails}>
                  <InfoRow icon="layers" label="Stage" value={project.stage || '—'} />
                  <InfoRow icon="location" label="City" value={project.city || '—'} />
                  <InfoRow icon="calendar" label="Start" value={project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                  <InfoRow icon="flag" label="End" value={project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                </View>
              </View>
            </Card>

            {/* Quick Stats */}
            <View style={styles.quickStatsRow}>
              <StatBox label="Team" value={(employees || []).length.toString()} icon="people" color={colors.info} />
              <StatBox label="Payments" value={`₹${(totalPaid / 100000).toFixed(1)}L`} icon="cash" color={colors.success} />
              <StatBox label="Materials" value={pendingMaterials.length.toString()} icon="cube" color={colors.warning} />
            </View>

            {/* Payment Progress */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>💰 Payment Progress</Text>
              <View style={styles.paymentProgress}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${totalBilled > 0 ? (totalPaid / totalBilled * 100) : 0}%`, backgroundColor: colors.success }]} />
                </View>
                <Text style={styles.paymentText}>₹{totalPaid.toLocaleString('en-IN')} / ₹{totalBilled.toLocaleString('en-IN')}</Text>
              </View>
            </Card>
          </>
        )}

        {/* Team */}
        {section === 'Team' && (
          <>
            <Text style={styles.sectionHeaderText}>Team Members</Text>
            {(employees || []).filter(e => e.role !== 'client').map((emp) => (
              <TouchableOpacity key={emp.id} onPress={() => router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: emp.id } })}>
                <Card style={styles.listCard}>
                  <View style={styles.listRow}>
                    <Avatar name={emp.full_name} uri={emp.avatar_url} size={40} />
                    <View style={styles.listInfo}>
                      <Text style={styles.listTitle}>{emp.full_name}</Text>
                      <Text style={styles.listSubtitle}>{emp.role} {emp.worker_id ? `· ${emp.worker_id}` : ''}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: emp.status === 'active' ? colors.success : colors.neutral[300] }]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Payments */}
        {section === 'Payments' && (
          <>
            <Text style={styles.sectionHeaderText}>Payment Milestones</Text>
            {(payments || []).map((p) => (
              <Card key={p.id} style={styles.listCard}>
                <View style={styles.listRow}>
                  <View style={[styles.payIcon, { backgroundColor: p.status === 'paid' ? colors.successBg : colors.warningBg }]}>
                    <Ionicons name={p.status === 'paid' ? 'checkmark-circle' : 'time'} size={20} color={p.status === 'paid' ? colors.success : colors.warning} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{p.milestone_name}</Text>
                    <Text style={styles.listSubtitle}>₹{p.amount.toLocaleString('en-IN')}{p.due_date ? ` · Due ${new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Text>
                  </View>
                  <Text style={[styles.payStatus, { color: p.status === 'paid' ? colors.success : colors.warning }]}>{p.status}</Text>
                </View>
              </Card>
            ))}
            {(!payments || payments.length === 0) && <EmptyState icon="cash-outline" text="No payment milestones" />}
          </>
        )}

        {/* Materials */}
        {section === 'Materials' && (
          <>
            <Text style={styles.sectionHeaderText}>Material Requests</Text>
            {(materialReqs || []).map((m) => (
              <Card key={m.id} style={styles.listCard}>
                <View style={styles.listRow}>
                  <View style={[styles.payIcon, { backgroundColor: m.status === 'pending' ? colors.warningBg : m.status === 'approved' ? colors.successBg : colors.errorBg }]}>
                    <Ionicons name="cube" size={20} color={m.status === 'pending' ? colors.warning : m.status === 'approved' ? colors.success : colors.error} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{m.material_name}</Text>
                    <Text style={styles.listSubtitle}>Qty: {m.qty}{m.spec ? ` · ${m.spec}` : ''}</Text>
                  </View>
                  <Text style={[styles.payStatus, {
                    color: m.status === 'pending' ? colors.warning : m.status === 'approved' ? colors.success : colors.error,
                  }]}>{m.status}</Text>
                </View>
              </Card>
            ))}
            {(!materialReqs || materialReqs.length === 0) && <EmptyState icon="cube-outline" text="No material requests" />}
          </>
        )}

        {/* DPR */}
        {section === 'DPR' && (
          <>
            <Text style={styles.sectionHeaderText}>Daily Progress Reports</Text>
            <EmptyState icon="document-text-outline" text="DPR list coming soon — view from Approvals" />
          </>
        )}

        {/* Tasks */}
        {section === 'Tasks' && (
          <>
            <Text style={styles.sectionHeaderText}>Project Tasks</Text>
            <EmptyState icon="list-outline" text="Task management coming in next iteration" />
          </>
        )}

        {/* Documents */}
        {section === 'Documents' && (
          <>
            <Text style={styles.sectionHeaderText}>Project Documents</Text>
            {(documents || []).map((doc) => (
              <Card key={doc.id} style={styles.listCard}>
                <View style={styles.listRow}>
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{doc.title}</Text>
                    <Text style={styles.listSubtitle}>{doc.category}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                </View>
              </Card>
            ))}
            {(!documents || documents.length === 0) && <EmptyState icon="folder-open-outline" text="No documents yet" />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.neutral[400]} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card style={styles.statBox}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </Card>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={40} color={colors.neutral[300]} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyMedium, color: colors.neutral[400] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { ...typography.h5, color: colors.ink, flex: 1, marginRight: spacing.sm },
  sectionTabs: { flexGrow: 0, marginBottom: spacing.lg },
  sectionTab: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface,
  },
  sectionTabActive: { backgroundColor: colors.primary },
  sectionTabText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  sectionTabTextActive: { color: colors.white },
  overviewCard: { padding: spacing.xl, marginBottom: spacing.md },
  progressSection: { flexDirection: 'row', gap: spacing.xl },
  progressRing: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 6, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  progressPct: { ...typography.h3, color: colors.primary },
  progressLabel: { ...typography.caption, color: colors.neutral[500] },
  progressDetails: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.neutral[400], width: 40 },
  infoValue: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, textTransform: 'capitalize' },
  quickStatsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statBox: { flex: 1, padding: spacing.md, alignItems: 'center', gap: 2 },
  statBoxValue: { ...typography.h5 },
  statBoxLabel: { ...typography.caption, color: colors.neutral[500] },
  sectionCard: { padding: spacing.lg, marginBottom: spacing.md },
  sectionCardTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.md },
  paymentProgress: { gap: spacing.sm },
  progressTrack: { height: 8, backgroundColor: colors.neutral[100], borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  paymentText: { ...typography.bodySmall, color: colors.neutral[600] },
  sectionHeaderText: { ...typography.h6, color: colors.ink, marginBottom: spacing.md, marginTop: spacing.sm },
  listCard: { padding: spacing.md, marginBottom: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listInfo: { flex: 1 },
  listTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  listSubtitle: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  payIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  payStatus: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.sm },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
