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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, StatusChip } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { usePendingDprs, usePendingLeave, usePendingMaterialRequests } from '../../src/hooks/useApprovals';
import { useUnreadCount } from '../../src/hooks/useNotifications';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin';

  const { data: projects, refetch: rProjects, isRefetching: r1 } = useProjects();
  const { data: employees, refetch: rEmployees, isRefetching: r2 } = useEmployees();
  const { data: pendingDprs } = usePendingDprs();
  const { data: pendingLeave } = usePendingLeave();
  const { data: pendingMaterials } = usePendingMaterialRequests();
  const { data: unreadCount } = useUnreadCount(profile?.id);

  const activeProjects = (projects || []).filter((p) => p.status !== 'completed');
  const activeEmployees = (employees || []).filter((e) => e.status === 'active');
  const onSiteEmployees = (employees || []).filter((e) => e.role === 'worker' || e.role === 'supervisor');
  const totalPending = (pendingDprs?.length || 0) + (pendingLeave?.length || 0) + (pendingMaterials?.length || 0);

  const onRefresh = () => { rProjects(); rEmployees(); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(admin)/notifications' as any)} style={styles.bellWrap}>
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
          {(unreadCount || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount! > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="business" value={activeProjects.length} label="Active Projects" color={colors.primary} onPress={() => router.push('/(admin)/projects')} />
        <StatCard icon="people" value={activeEmployees.length} label="Employees" color={colors.info} onPress={() => router.push('/(admin)/employees' as any)} />
        <StatCard icon="checkmark-circle" value={totalPending} label="Pending" color={colors.warning} onPress={() => router.push('/(admin)/approvals' as any)} />
      </View>

      {/* Active Projects */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🚧 Active Projects</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/projects')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      {activeProjects.slice(0, 3).map((project) => (
        <TouchableOpacity key={project.id} onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: project.id } })}>
          <Card style={styles.projectCard} variant="interactive">
            <View style={styles.projectRow}>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectDetail}>{project.city || ''} · {project.stage || ''}</Text>
              </View>
              <StatusChip status={project.status} />
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${project.progress_pct}%` }]} />
              </View>
              <Text style={styles.progressText}>{project.progress_pct}%</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
      {activeProjects.length === 0 && (
        <Card style={styles.emptyCard} variant="flat">
          <Text style={styles.emptyText}>No active projects</Text>
        </Card>
      )}

      {/* Approvals Summary */}
      {totalPending > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⏳ Pending Approvals</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/approvals' as any)}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <Card style={styles.approvalsCard}>
            {(pendingDprs?.length || 0) > 0 && (
              <ApprovalRow icon="document-text" label="DPR Reports" count={pendingDprs!.length} color={colors.info} />
            )}
            {(pendingLeave?.length || 0) > 0 && (
              <ApprovalRow icon="calendar" label="Leave Requests" count={pendingLeave!.length} color={colors.warning} />
            )}
            {(pendingMaterials?.length || 0) > 0 && (
              <ApprovalRow icon="cube" label="Material Requests" count={pendingMaterials!.length} color={colors.pending} />
            )}
          </Card>
        </>
      )}

      {/* Employee Summary */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👷 Team Overview</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/employees' as any)}>
          <Text style={styles.seeAll}>Manage</Text>
        </TouchableOpacity>
      </View>
      <Card style={styles.teamCard}>
        <View style={styles.teamStats}>
          <View style={styles.teamStat}>
            <Text style={styles.teamStatNum}>{onSiteEmployees.length}</Text>
            <Text style={styles.teamStatLabel}>Field Staff</Text>
          </View>
          <View style={[styles.teamStat, styles.teamStatBorder]}>
            <Text style={styles.teamStatNum}>{(employees || []).filter(e => e.role === 'supervisor').length}</Text>
            <Text style={styles.teamStatLabel}>Supervisors</Text>
          </View>
          <View style={styles.teamStat}>
            <Text style={styles.teamStatNum}>{(employees || []).filter(e => e.status === 'on_leave').length}</Text>
            <Text style={styles.teamStatLabel}>On Leave</Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: spacing.md }]}>⚡ Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickAction icon="person-add" label="Add Employee" onPress={() => router.push('/(admin)/add-employee' as any)} />
        <QuickAction icon="add-circle" label="New Task" onPress={() => router.push('/(admin)/add' as any)} />
        <QuickAction icon="business" label="New Project" onPress={() => router.push('/(admin)/add' as any)} />
        <QuickAction icon="cube" label="Materials" onPress={() => router.push('/(admin)/projects')} />
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, color, onPress }: { icon: string; value: number; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.statCardWrap}>
      <Card style={styles.statCard}>
        <Ionicons name={icon as any} size={22} color={color} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Card>
    </TouchableOpacity>
  );
}

function ApprovalRow({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <View style={styles.approvalRow}>
      <View style={[styles.approvalIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.approvalLabel}>{label}</Text>
      <View style={[styles.approvalBadge, { backgroundColor: color + '15' }]}>
        <Text style={[styles.approvalCount, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing['2xl'] },
  headerLeft: { flex: 1 },
  greeting: { ...typography.h4, color: colors.ink },
  date: { ...typography.bodySmall, color: colors.neutral[500], marginTop: 2 },
  bellWrap: { position: 'relative', padding: spacing.sm },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: colors.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { ...typography.caption, color: colors.white, fontFamily: fontFamily.semiBold, fontSize: 10 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
  statCardWrap: { flex: 1 },
  statCard: { padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.h3, fontFamily: fontFamily.bold },
  statLabel: { ...typography.caption, color: colors.neutral[500], textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h6, color: colors.ink },
  seeAll: { ...typography.bodySmall, color: colors.primary, fontFamily: fontFamily.medium },
  projectCard: { padding: spacing.lg, marginBottom: spacing.sm },
  projectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  projectInfo: { flex: 1, marginRight: spacing.sm },
  projectName: { ...typography.h6, color: colors.ink },
  projectDetail: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.neutral[100], borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary, width: 36, textAlign: 'right' },
  emptyCard: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
  approvalsCard: { padding: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  approvalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  approvalIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  approvalLabel: { flex: 1, ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  approvalBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  approvalCount: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  teamCard: { padding: spacing.lg, marginBottom: spacing.xl },
  teamStats: { flexDirection: 'row' },
  teamStat: { flex: 1, alignItems: 'center' },
  teamStatBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.neutral[100] },
  teamStatNum: { ...typography.h4, color: colors.ink },
  teamStatLabel: { ...typography.caption, color: colors.neutral[500] },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickAction: { width: '47%', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  quickActionIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
});
