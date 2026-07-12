import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatsSkeleton, CardSkeleton, EmptyState, emptyStates, RetryBanner } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { usePendingDprs, usePendingLeave, usePendingMaterialRequests } from '../../src/hooks/useApprovals';
import { useMyTasks } from '../../src/hooks/useTasks';
import { useUnreadCount } from '../../src/hooks/useNotifications';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const SCREEN_WIDTH = Dimensions.get('window').width;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* ─── Quick-action icons (matching reference) ─────────────────────── */
const quickActions = [
  { icon: 'add-circle-outline' as const, label: 'Add Project', route: '/(admin)/create-project' },
  { icon: 'person-add-outline' as const, label: 'Add Employee', route: '/(admin)/add-employee' },
  { icon: 'checkbox-outline' as const, label: 'Mark Attendance', route: '/(admin)/attendance-report' },
  { icon: 'document-text-outline' as const, label: 'Create DPR', route: '/(admin)/dpr-management' },
];

/* ─── Overview stat config ────────────────────────────────────────── */
type OverviewStat = {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  getValue: (d: any) => number;
  getSub: (d: any) => string;
};

const overviewStats: OverviewStat[] = [
  {
    icon: 'people-outline',
    iconBg: '#EEF2FF',
    iconColor: '#6366F1',
    label: 'Total Employees',
    getValue: (d) => d.employees?.length || 0,
    getSub: (d) => {
      const active = (d.employees || []).filter((e: any) => e.status === 'active').length;
      return `${active} active`;
    },
  },
  {
    icon: 'calendar-outline',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    label: "Today's Present",
    getValue: (d) => {
      const workers = (d.employees || []).filter((e: any) => e.role === 'worker' || e.role === 'supervisor');
      return Math.round(workers.length * 0.63); // placeholder until attendance API
    },
    getSub: (d) => '63% of total',
  },
  {
    icon: 'location-outline',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
    label: 'Active Sites',
    getValue: (d) => (d.projects || []).filter((p: any) => p.status === 'active' || p.status === 'in_progress').length,
    getSub: (d) => {
      const inProgress = (d.projects || []).filter((p: any) => p.status === 'in_progress').length;
      return `${inProgress} in progress`;
    },
  },
  {
    icon: 'document-text-outline',
    iconBg: '#F3E8FF',
    iconColor: '#8B5CF6',
    label: 'Pending DPR',
    getValue: (d) => d.pendingDprs?.length || 0,
    getSub: () => 'Needs attention',
  },
];

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin';

  const { data: projects, refetch: rProjects, isRefetching: r1, isLoading: l1, isError: e1 } = useProjects();
  const { data: employees, refetch: rEmployees, isRefetching: r2, isLoading: l2, isError: e2 } = useEmployees();
  const { data: pendingDprs } = usePendingDprs();
  const { data: pendingLeave } = usePendingLeave();
  const { data: pendingMaterials } = usePendingMaterialRequests();
  const { data: myTasks = [] } = useMyTasks(profile?.id);
  const pendingTasks = myTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
  const { data: unreadCount } = useUnreadCount(profile?.id);

  const activeProjects = (projects || []).filter((p) => p.status !== 'completed');
  const totalProjects = (projects || []).length;
  const totalSites = activeProjects.length;
  const dataBundle = { projects, employees, pendingDprs, pendingLeave, pendingMaterials };

  const onRefresh = () => { rProjects(); rEmployees(); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={colors.neutral[400]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
            <Text style={styles.titleText}>Dashboard</Text>
            <Text style={styles.subtitle}>Here's what's happening today.</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/(admin)/notifications' as any)} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
            {(unreadCount || 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount! > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(admin)/global-search' as any)} style={styles.iconBtn}>
            <Ionicons name="sync-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero / Splash Image ─────────────────────────────── */}
      <View style={styles.heroContainer}>
        <Image
          source={require('../../assets/images/splash.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* Stats overlay card */}
        <View style={styles.heroOverlay}>
          <View style={styles.heroStatCard}>
            <View style={styles.heroStatLeft}>
              <View style={styles.heroStatItem}>
                <View style={[styles.heroStatIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.heroStatLabel}>Total Projects</Text>
                  <Text style={styles.heroStatValue}>{totalProjects}</Text>
                </View>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <View style={[styles.heroStatIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="business-outline" size={20} color="#6366F1" />
                </View>
                <View>
                  <Text style={styles.heroStatLabel}>Total Sites</Text>
                  <Text style={styles.heroStatValue}>{totalSites}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.heroChartBtn}
              onPress={() => router.push('/(admin)/analytics' as any)}
            >
              <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Quick Actions Row ───────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}
        style={styles.quickActionsScroll}
      >
        {quickActions.map((qa) => (
          <TouchableOpacity
            key={qa.label}
            style={styles.quickActionItem}
            onPress={() => router.push(qa.route as any)}
          >
            <View style={styles.quickActionCircle}>
              <Ionicons name={qa.icon as any} size={26} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>{qa.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Overview Section ────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/(admin)/analytics' as any)}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {(l1 || l2) ? (
          <StatsSkeleton />
        ) : (e1 || e2) ? (
          <RetryBanner onRetry={onRefresh} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.overviewRow}
          >
            {overviewStats.map((stat) => (
              <View key={stat.label} style={styles.overviewCard}>
                <View style={[styles.overviewIconWrap, { backgroundColor: stat.iconBg }]}>
                  <Ionicons name={stat.icon as any} size={20} color={stat.iconColor} />
                </View>
                <Text style={styles.overviewLabel}>{stat.label}</Text>
                <Text style={styles.overviewValue}>{stat.getValue(dataBundle)}</Text>
                <Text style={[styles.overviewSub, { color: stat.iconColor }]}>{stat.getSub(dataBundle)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Recent Projects ─────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Projects</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/(admin)/projects')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {l1 ? (
          <CardSkeleton count={2} />
        ) : activeProjects.length === 0 ? (
          <EmptyState {...emptyStates.projects} compact actionLabel="Create Project" onAction={() => router.push('/(admin)/create-project' as any)} />
        ) : (
          activeProjects.slice(0, 4).map((project) => (
            <TouchableOpacity
              key={project.id}
              onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: project.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.projectCard}>
                {/* Project thumbnail placeholder */}
                <View style={styles.projectThumb}>
                  <Ionicons name="business" size={28} color={colors.neutral[300]} />
                </View>
                <View style={styles.projectInfo}>
                  <View style={styles.projectTopRow}>
                    <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                    <TouchableOpacity style={styles.projectMenu}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.neutral[500]} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.projectLocationRow}>
                    <Ionicons name="location-outline" size={13} color={colors.neutral[400]} />
                    <Text style={styles.projectLocation}>{project.city || 'Location TBD'}</Text>
                  </View>
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${project.progress_pct || 0}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{project.progress_pct || 0}%</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Management Cards ──────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manage</Text>
        </View>
        <View style={styles.manageGrid}>
          {[
            { icon: 'people', label: 'Employees', route: '/(admin)/employees', color: '#6366F1', bg: '#EEF2FF' },
            { icon: 'business', label: 'Clients', route: '/(admin)/clients', color: '#0EA5E9', bg: '#E0F2FE' },
            { icon: 'folder', label: 'Documents', route: '/(admin)/documents', color: colors.primary, bg: colors.primary + '15' },
            { icon: 'chatbubbles', label: 'Messages', route: '/(admin)/chat', color: '#10B981', bg: '#DCFCE7' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.manageCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.manageIconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.manageLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.neutral[300]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── My Tasks ───────────────────────────────────────── */}
      {pendingTasks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Tasks</Text>
            <Text style={styles.taskCount}>{pendingTasks.length} pending</Text>
          </View>
          {pendingTasks.slice(0, 3).map((task: any) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={[styles.taskDot, { backgroundColor: task.priority === 'high' ? colors.error : task.priority === 'medium' ? colors.warning : colors.info }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.priority} priority</Text>
              </View>
              <View style={[styles.taskStatus, { backgroundColor: task.status === 'in_progress' ? colors.info + '15' : colors.warning + '15' }]}>
                <Text style={[styles.taskStatusText, { color: task.status === 'in_progress' ? colors.info : colors.warning }]}>
                  {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Pending Approvals ───────────────────────────────── */}
      {((pendingDprs?.length || 0) + (pendingLeave?.length || 0) + (pendingMaterials?.length || 0)) > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/(admin)/approvals' as any)}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>
          <View style={styles.approvalsRow}>
            {(pendingDprs?.length || 0) > 0 && (
              <ApprovalChip icon="document-text" label="DPR" count={pendingDprs!.length} color={colors.info} />
            )}
            {(pendingLeave?.length || 0) > 0 && (
              <ApprovalChip icon="calendar" label="Leave" count={pendingLeave!.length} color={colors.warning} />
            )}
            {(pendingMaterials?.length || 0) > 0 && (
              <ApprovalChip icon="cube" label="Materials" count={pendingMaterials!.length} color={colors.pending} />
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/* ─── Approval Chip Component ─────────────────────────────────────── */
function ApprovalChip({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <View style={[styles.approvalChip, { borderColor: color + '30' }]}>
      <View style={[styles.approvalChipIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.approvalChipLabel}>{label}</Text>
      <View style={[styles.approvalChipBadge, { backgroundColor: color }]}>
        <Text style={styles.approvalChipCount}>{count}</Text>
      </View>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: spacing.sm },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  headerText: { flex: 1 },
  greeting: { ...typography.bodySmall, color: colors.neutral[500] },
  titleText: { ...typography.h3, color: colors.ink, marginTop: 1 },
  subtitle: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: colors.white, fontFamily: fontFamily.bold },

  /* Hero */
  heroContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    marginBottom: spacing.lg,
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  heroStatCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroStatLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatLabel: { ...typography.caption, color: colors.neutral[500] },
  heroStatValue: { ...typography.h4, color: colors.ink, fontFamily: fontFamily.bold },
  heroStatDivider: { width: 1, height: 32, backgroundColor: colors.neutral[200] },
  heroChartBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Quick Actions */
  quickActionsScroll: { marginBottom: spacing.xl },
  quickActionsRow: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  quickActionItem: { alignItems: 'center', width: 76 },
  quickActionCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.ink,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    lineHeight: 14,
  },

  /* Section */
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h6, color: colors.ink, fontFamily: fontFamily.bold },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { ...typography.bodySmall, color: colors.neutral[500] },

  /* Overview Cards */
  overviewRow: { gap: spacing.sm },
  overviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  overviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  overviewLabel: { ...typography.caption, color: colors.neutral[500], marginBottom: 2 },
  overviewValue: { ...typography.h3, color: colors.ink, fontFamily: fontFamily.bold },
  overviewSub: { ...typography.caption, marginTop: 2 },

  /* Project Cards */
  projectCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  projectThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  projectInfo: { flex: 1, justifyContent: 'center' },
  projectTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  projectName: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: colors.ink, flex: 1, marginRight: spacing.xs },
  projectMenu: { padding: 4 },
  projectLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, marginBottom: spacing.sm },
  projectLocation: { ...typography.caption, color: colors.neutral[400] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: { flex: 1, height: 5, backgroundColor: colors.neutral[100], borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary, width: 32, textAlign: 'right' },

  /* Manage Grid */
  manageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  manageCard: {
    width: '48%' as any,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  manageIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  manageLabel: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, flex: 1 },

  /* Tasks */
  taskCount: { ...typography.caption, color: colors.neutral[500] },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  taskMeta: { ...typography.caption, color: colors.neutral[400], marginTop: 1 },
  taskStatus: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.md },
  taskStatusText: { ...typography.caption, fontFamily: fontFamily.medium, fontSize: 10 },

  /* Approvals */
  approvalsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  approvalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
  },
  approvalChipIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  approvalChipLabel: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  approvalChipBadge: { borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  approvalChipCount: { ...typography.caption, color: colors.white, fontFamily: fontFamily.bold, fontSize: 11 },
});
