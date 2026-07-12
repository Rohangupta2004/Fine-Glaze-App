/**
 * Client Dashboard — Rich, feature-complete portal
 * Shows project progress, site staff, recent DPRs, documents, payments, chat
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Card, StatusChip, Avatar, CardSkeleton, EmptyState, emptyStates } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useAllPayments } from '../../src/hooks/usePayments';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

/* ── Hooks ────────────────────────────────────────────────────────── */

/** Staff assigned to client's projects */
function useSiteStaff(projectIds: string[]) {
  return useQuery({
    queryKey: ['client-site-staff', projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('profile_id, project_id, role_on_site')
        .in('project_id', projectIds)
        .eq('active', true);
      if (error) throw error;
      if (!assignments?.length) return [];
      const profileIds = [...new Set(assignments.map((a: any) => a.profile_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .in('id', profileIds);
      return (assignments || []).map((a: any) => ({
        ...a,
        profile: (profiles || []).find((p: any) => p.id === a.profile_id),
      }));
    },
    enabled: projectIds.length > 0,
  });
}

/** Recent approved DPRs on client's projects */
function useClientDprs(projectIds: string[]) {
  return useQuery({
    queryKey: ['client-dprs', projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await supabase
        .from('dprs')
        .select('*')
        .in('project_id', projectIds)
        .eq('status', 'approved')
        .order('date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });
}

/** Recent documents shared with client */
function useClientDocs(projectIds: string[]) {
  return useQuery({
    queryKey: ['client-docs-recent', projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* ── Component ────────────────────────────────────────────────────── */

export default function ClientDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Client';

  const { data: projects, refetch, isRefetching, isLoading } = useProjects();
  const { data: payments } = useAllPayments();
  const projectIds = useMemo(() => (projects || []).map(p => p.id), [projects]);
  const { data: siteStaff = [] } = useSiteStaff(projectIds);
  const { data: recentDprs = [] } = useClientDprs(projectIds);
  const { data: recentDocs = [] } = useClientDocs(projectIds);

  const project = (projects || [])[0];
  const totalBilled = (payments || []).reduce((s, p) => s + p.amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={colors.neutral[400]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
            <Text style={styles.titleText}>My Projects</Text>
            <Text style={styles.subtitle}>Track your project progress</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(client)/chat' as any)}
          style={styles.iconBtn}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: spacing.lg }}><CardSkeleton count={3} /></View>
      ) : !project ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <EmptyState {...emptyStates.projects} />
        </View>
      ) : (
        <>
          {/* ── Hero: splash image + project overlay ──────── */}
          <View style={styles.heroContainer}>
            <Image
              source={require('../../assets/images/splash.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay}>
              <View style={styles.heroCard}>
                <View style={styles.heroStatRow}>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatLabel}>Progress</Text>
                    <Text style={styles.heroStatValue}>{project.progress_pct || 0}%</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatLabel}>Stage</Text>
                    <Text style={[styles.heroStatValue, { textTransform: 'capitalize' }]}>{project.stage || '—'}</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatLabel}>Paid</Text>
                    <Text style={[styles.heroStatValue, { color: colors.success }]}>{paidPct}%</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── Project Info Card ─────────────────────────── */}
          <View style={styles.section}>
            <Card style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View style={styles.projectLocationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.neutral[400]} />
                    <Text style={styles.projectLocation}>{project.city || 'Location TBD'}</Text>
                  </View>
                </View>
                <StatusChip status={project.status} />
              </View>
              {/* Progress bar */}
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${project.progress_pct || 0}%` }]} />
                </View>
                <Text style={styles.progressText}>{project.progress_pct || 0}%</Text>
              </View>
              {/* Dates */}
              <View style={styles.datesRow}>
                <View style={styles.dateItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.neutral[400]} />
                  <Text style={styles.dateLabel}>Start:</Text>
                  <Text style={styles.dateValue}>
                    {project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Ionicons name="flag-outline" size={14} color={colors.neutral[400]} />
                  <Text style={styles.dateLabel}>End:</Text>
                  <Text style={styles.dateValue}>
                    {project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* ── Quick Actions ─────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsRow}
            style={{ marginBottom: spacing.xl }}
          >
            {[
              { icon: 'document-text-outline', label: 'DPR Reports', route: '/(client)/updates' },
              { icon: 'folder-outline', label: 'Documents', route: '/(client)/documents' },
              { icon: 'card-outline', label: 'Payments', route: '/(client)/payments' },
              { icon: 'chatbubble-outline', label: 'Chat', route: '/(client)/chat' },
            ].map((qa) => (
              <TouchableOpacity
                key={qa.label}
                style={styles.quickActionItem}
                onPress={() => router.push(qa.route as any)}
              >
                <View style={styles.quickActionCircle}>
                  <Ionicons name={qa.icon as any} size={24} color={colors.primary} />
                </View>
                <Text style={styles.quickActionLabel}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Payment Summary ───────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Overview</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/payments')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.paymentCard}>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentItem}>
                  <View style={[styles.paymentIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="receipt-outline" size={18} color="#6366F1" />
                  </View>
                  <Text style={styles.paymentLabel}>Total Billed</Text>
                  <Text style={styles.paymentValue}>₹{totalBilled.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.paymentItem}>
                  <View style={[styles.paymentIconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                  </View>
                  <Text style={styles.paymentLabel}>Paid</Text>
                  <Text style={[styles.paymentValue, { color: colors.success }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.paymentItem}>
                  <View style={[styles.paymentIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="time-outline" size={18} color="#D97706" />
                  </View>
                  <Text style={styles.paymentLabel}>Pending</Text>
                  <Text style={[styles.paymentValue, { color: colors.warning }]}>₹{(totalBilled - totalPaid).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* ── Site Staff ────────────────────────────────── */}
          {siteStaff.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Working Staff</Text>
                <Text style={styles.staffCount}>{siteStaff.length} assigned</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {siteStaff.map((s: any, i: number) => (
                  <View key={i} style={styles.staffCard}>
                    <Avatar name={s.profile?.full_name || 'Staff'} size={44} />
                    <Text style={styles.staffName} numberOfLines={1}>{s.profile?.full_name || 'Staff'}</Text>
                    <Text style={styles.staffRole}>{s.role_on_site || s.profile?.role || '—'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Recent DPRs ───────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Progress</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/updates')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            {recentDprs.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={32} color={colors.neutral[300]} />
                <Text style={styles.emptyText}>No progress reports yet</Text>
              </Card>
            ) : (
              recentDprs.slice(0, 3).map((dpr: any) => (
                <Card key={dpr.id} style={styles.dprCard}>
                  <View style={styles.dprHeader}>
                    <View style={[styles.dprIcon, { backgroundColor: colors.success + '15' }]}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dprDate}>
                        {new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      {dpr.work_type && <Text style={styles.dprType}>{dpr.work_type}</Text>}
                    </View>
                    <StatusChip status="approved" />
                  </View>
                  <Text style={styles.dprWork} numberOfLines={2}>{dpr.work_done}</Text>
                </Card>
              ))
            )}
          </View>

          {/* ── Recent Documents ───────────────────────────── */}
          {recentDocs.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Documents</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/documents')}>
                  <Text style={styles.viewAllText}>View All →</Text>
                </TouchableOpacity>
              </View>
              {recentDocs.slice(0, 3).map((doc: any) => (
                <Card key={doc.id} style={styles.docCard}>
                  <View style={styles.docRow}>
                    <View style={[styles.docIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="document-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                      <Text style={styles.docMeta}>{doc.category} · {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

/* ── Styles ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: spacing.sm },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.neutral[200],
  },
  headerText: { flex: 1 },
  greeting: { ...typography.bodySmall, color: colors.neutral[500] },
  titleText: { ...typography.h3, color: colors.ink, marginTop: 1 },
  subtitle: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs,
  },

  /* Hero */
  heroContainer: {
    marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.neutral[100], marginBottom: spacing.lg, height: 180,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.sm, paddingBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  heroStatItem: { alignItems: 'center' },
  heroStatLabel: { ...typography.caption, color: colors.neutral[500] },
  heroStatValue: { ...typography.h4, color: colors.ink, fontFamily: fontFamily.bold },
  heroStatDivider: { width: 1, height: 28, backgroundColor: colors.neutral[200] },

  /* Section */
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h6, color: colors.ink, fontFamily: fontFamily.bold },
  viewAllText: { ...typography.bodySmall, color: colors.primary, fontFamily: fontFamily.medium },
  staffCount: { ...typography.caption, color: colors.neutral[500] },

  /* Quick Actions */
  quickActionsRow: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  quickActionItem: { alignItems: 'center', width: 72 },
  quickActionCircle: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.neutral[200],
  },
  quickActionLabel: { ...typography.caption, color: colors.ink, fontFamily: fontFamily.medium, textAlign: 'center', lineHeight: 14 },

  /* Project Card */
  projectCard: { padding: spacing.lg },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  projectName: { ...typography.h5, color: colors.ink },
  projectLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  projectLocation: { ...typography.caption, color: colors.neutral[400] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.neutral[100], borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary, width: 32, textAlign: 'right' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateLabel: { ...typography.caption, color: colors.neutral[400] },
  dateValue: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.ink },

  /* Payment */
  paymentCard: { padding: spacing.lg },
  paymentGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentItem: { alignItems: 'center', flex: 1 },
  paymentIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  paymentLabel: { ...typography.caption, color: colors.neutral[500], marginBottom: 2 },
  paymentValue: { ...typography.h6, color: colors.ink, fontFamily: fontFamily.bold },

  /* Staff */
  staffCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', width: 100, borderWidth: 1, borderColor: colors.neutral[100],
  },
  staffName: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.ink, marginTop: spacing.xs, textAlign: 'center' },
  staffRole: { ...typography.caption, color: colors.neutral[400], textTransform: 'capitalize', fontSize: 10 },

  /* DPR */
  dprCard: { padding: spacing.md, marginBottom: spacing.sm },
  dprHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  dprIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dprDate: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  dprType: { ...typography.caption, color: colors.neutral[400] },
  dprWork: { ...typography.bodySmall, color: colors.neutral[600], lineHeight: 20, marginLeft: 32 + spacing.sm },

  /* Docs */
  docCard: { padding: spacing.md, marginBottom: spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docName: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  docMeta: { ...typography.caption, color: colors.neutral[400] },

  /* Empty */
  emptyCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400] },
});
