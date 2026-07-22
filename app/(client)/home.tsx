import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GradientIcon, AnimatedStateView } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useAllPayments } from '../../src/hooks/usePayments';
import { useFacadeSections } from '../../src/hooks/useContractorFeatures';
import { useDprTimeline } from '../../src/hooks/useDprTimeline';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

export default function ClientDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Client';
  const { data: projects, refetch, isRefetching } = useProjects();
  const { data: payments } = useAllPayments();
  const project = (projects || [])[0];
  const { data: sections = [] } = useFacadeSections(project?.id);
  const { data: timeline } = useDprTimeline(project?.id);

  const todayDprEntry = timeline?.[0]; // Most recent DPR entry

  const totalBilled = (payments || []).reduce((s, p) => s + p.amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = totalBilled - totalPaid;
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const pendingTasksCount = 0;

  const handleCallManager = () => {
    const phoneNumber = '+919876543210';
    showAlert(
      'Call Site Project Manager',
      `Would you like to place a direct call to the Fine Glaze Site Manager (${phoneNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL(`tel:${phoneNumber}`).catch(() => {
            showAlert('Call Error', 'Phone calling is not supported on this device.');
          }),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#695030" />}
      >
        {/* Top Header: Greeting + Status Pill */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.brandLogoFrame}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.brandLogoImage} 
                resizeMode="contain" 
              />
            </View>
            <View>
              <Text style={styles.greeting}>Welcome, {firstName} 👋</Text>
              <Text style={styles.greetingSub}>Client Executive Portal</Text>
            </View>
          </View>
          <View style={styles.onTrackPill}>
            <View style={styles.onTrackDot} />
            <Text style={styles.onTrackText}>On Track</Text>
          </View>
        </View>

        {/* Executive Quick Contact Action Bar */}
        <View style={styles.quickActionBar}>
          <TouchableOpacity
            style={[styles.quickActionBtn, styles.callBtn]}
            onPress={handleCallManager}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={16} color="#695030" />
            <Text style={styles.callBtnText}>Call Site Manager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, styles.chatBtn]}
            onPress={() => router.push('/(client)/chat')}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
            <Text style={styles.chatBtnText}>Project Chat</Text>
          </TouchableOpacity>
        </View>

        {project ? (
          <>
            {/* SECTION 1: Double-Bezel Executive Hero Project Card */}
            <View style={styles.heroShell}>
              <View style={styles.heroCore}>
                {/* Micro Eyebrow Tag */}
                <View style={styles.eyebrowRow}>
                  <View style={styles.eyebrowTag}>
                    <Text style={styles.eyebrowText}>● PROJECT OVERVIEW</Text>
                  </View>
                  <View style={styles.stagePill}>
                    <Text style={styles.stagePillText}>{project.stage || 'In Progress'}</Text>
                  </View>
                </View>

                {/* Project Title & System Subtitle */}
                <Text style={styles.heroProjectName}>{project.name}</Text>
                <Text style={styles.heroProjectMeta}>{project.city} • {project.type || 'Unitized Structural Glazing'}</Text>

                <View style={styles.heroDivider} />

                {/* Content Row: Dual-Ring Gauge & Metadata */}
                <View style={styles.heroContentRow}>
                  {/* Executive Dual-Ring Gauge Wheel */}
                  <View style={styles.wheelWrapper}>
                    <View style={styles.wheelOuterTrack} />
                    <View style={[styles.wheelArc, { borderColor: '#B89047' }]} />
                    <View style={styles.wheelCenter}>
                      <Text style={styles.wheelPct}>{project.progress_pct}%</Text>
                      <Text style={styles.wheelLabel}>Complete</Text>
                    </View>
                  </View>

                  {/* Metadata List */}
                  <View style={styles.heroMetaList}>
                    <View style={styles.heroMetaRow}>
                      <Ionicons name="calendar-outline" size={15} color="#8B6840" />
                      <Text style={styles.heroMetaLabel}>Start Date</Text>
                      <Text style={styles.heroMetaValue}>
                        {project.start_date
                          ? new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '9 Jul 2026'}
                      </Text>
                    </View>
                    <View style={styles.heroMetaRow}>
                      <Ionicons name="flag-outline" size={15} color="#8B6840" />
                      <Text style={styles.heroMetaLabel}>Expected End</Text>
                      <Text style={styles.heroMetaValue}>
                        {project.expected_end_date
                          ? new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '22 Jul 2026'}
                      </Text>
                    </View>
                    <View style={styles.heroMetaRow}>
                      <Ionicons name="shield-checkmark-outline" size={15} color="#8B6840" />
                      <Text style={styles.heroMetaLabel}>Spec Standard</Text>
                      <Text style={styles.heroMetaValue}>ASTM E1300 / IS 2553</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* WHAT'S ON SITE TODAY Card — Double-Bezel Architecture */}
            <View style={styles.heroShell}>
              <View style={styles.heroCore}>
                <View style={styles.eyebrowRow}>
                  <View style={[styles.eyebrowTag, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                    <Text style={[styles.eyebrowText, { color: '#16A34A' }]}>● LIVE SITE STATUS TODAY</Text>
                  </View>
                  <Text style={styles.todayDateText}>
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>

                {todayDprEntry ? (
                  <>
                    <View style={styles.siteWorkHeaderRow}>
                      <View style={styles.siteWorkTypeBadge}>
                        <Ionicons name="construct-outline" size={14} color="#695030" />
                        <Text style={styles.siteWorkTypeText}>{todayDprEntry.dpr.work_type || 'Glazing Installation'}</Text>
                      </View>
                      {todayDprEntry.dpr.level_zone ? (
                        <Text style={styles.siteZoneText}>Zone: {todayDprEntry.dpr.level_zone}</Text>
                      ) : null}
                    </View>

                    {todayDprEntry.dpr.work_done ? (
                      <Text style={styles.siteWorkDesc}>{todayDprEntry.dpr.work_done}</Text>
                    ) : (
                      <Text style={styles.siteWorkDesc}>Site supervisor active. Glazing assembly and bracket alignment in progress on active elevation.</Text>
                    )}

                    <TouchableOpacity
                      style={styles.viewTimelineBtn}
                      onPress={() => router.push('/(client)/updates')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.viewTimelineText}>View Site Photos & Details ({todayDprEntry.media.length} photos)</Text>
                      <Ionicons name="chevron-forward" size={14} color="#695030" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.siteWorkDesc}>
                      Today's site installation is active. Site supervisors are updating Daily Progress Reports (DPR) and photo evidence.
                    </Text>
                    <TouchableOpacity
                      style={styles.viewTimelineBtn}
                      onPress={() => router.push('/(client)/updates')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.viewTimelineText}>Open Live Site Updates Timeline ›</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* 4 Stat Cards Bento Grid — Soft Porcelain Fill */}
            <View style={styles.statsGrid}>
              {/* Progress */}
              <View style={styles.statCard}>
                <GradientIcon name="trending-up-outline" iconSize={18} preset="brand" />
                <Text style={[styles.statValue, { color: '#695030' }]}>{project.progress_pct}%</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Progress</Text>
                <View style={styles.statAccentTrack}>
                  <View style={[styles.statAccentFill, { width: `${project.progress_pct}%`, backgroundColor: '#695030' }]} />
                </View>
              </View>

              {/* Paid */}
              <View style={styles.statCard}>
                <GradientIcon name="cash-outline" iconSize={18} preset="success" />
                <Text style={[styles.statValue, { color: '#16A34A' }]}>{paidPct}%</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Paid</Text>
                <View style={styles.statAccentTrack}>
                  <View style={[styles.statAccentFill, { width: `${paidPct}%`, backgroundColor: '#16A34A' }]} />
                </View>
              </View>

              {/* Milestones */}
              <View style={styles.statCard}>
                <GradientIcon name="document-text-outline" iconSize={18} preset="warning" />
                <Text style={[styles.statValue, { color: '#B89047' }]}>{(payments || []).length}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Milestones</Text>
                <View style={styles.statAccentTrack}>
                  <View style={[styles.statAccentFill, { width: '60%', backgroundColor: '#B89047' }]} />
                </View>
              </View>

              {/* Pending Tasks */}
              <View style={styles.statCard}>
                <GradientIcon name="checkmark-circle-outline" iconSize={18} preset="brand" />
                <Text style={[styles.statValue, { color: '#4A3728' }]}>{pendingTasksCount}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Pending Tasks</Text>
                <View style={styles.statAccentTrack}>
                  <View style={[styles.statAccentFill, { width: '20%', backgroundColor: '#4A3728' }]} />
                </View>
              </View>
            </View>

            {/* Payment Overview Card */}
            <View style={styles.porcelainCard}>
              <View style={styles.paymentCardHeader}>
                <View style={styles.paymentHeaderLeft}>
                  <GradientIcon name="wallet-outline" iconSize={18} preset="brand" />
                  <Text style={styles.paymentCardTitle}>Payment Overview</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => router.push('/(client)/payments')}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={14} color="#695030" />
                </TouchableOpacity>
              </View>

              <View style={styles.paymentStatsRow}>
                <View style={styles.paymentStatCol}>
                  <Text style={styles.paymentStatLabel}>TOTAL BILLED</Text>
                  <Text style={[styles.paymentStatValue, { color: '#695030' }]}>₹{totalBilled.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.paymentDivider} />
                <View style={styles.paymentStatCol}>
                  <Text style={styles.paymentStatLabel}>PAID</Text>
                  <Text style={[styles.paymentStatValue, { color: '#16A34A' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.paymentDivider} />
                <View style={styles.paymentStatCol}>
                  <Text style={styles.paymentStatLabel}>PENDING</Text>
                  <Text style={[styles.paymentStatValue, { color: '#D97706' }]}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Progress track */}
              <View style={styles.paymentProgressTrack}>
                <View style={[styles.paymentProgressFill, { width: `${paidPct}%` }]} />
              </View>
              <Text style={styles.paymentCollectedText}>{paidPct}% collected</Text>
            </View>

            {/* Recent Activity Section */}
            <View style={styles.activityHeaderRow}>
              <Text style={styles.activitySectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/updates')}>
                <Text style={styles.viewAllText}>View All ›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.porcelainCard}>
              <View style={styles.activityRow}>
                <View style={[styles.activityIconWrap, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
                  <Ionicons name="document-text-outline" size={18} color="#16A34A" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Payment of ₹{totalPaid > 0 ? totalPaid.toLocaleString('en-IN') : '20,000,000'} received</Text>
                  <Text style={styles.activityMeta}>8 Jul 2026 • 11:30 AM</Text>
                </View>
                <View style={[styles.activityBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
                  <Text style={[styles.activityBadgeText, { color: '#16A34A' }]}>Payment</Text>
                </View>
              </View>

              <View style={styles.activityRowDivider} />

              <View style={styles.activityRow}>
                <View style={[styles.activityIconWrap, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Ionicons name="document-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Milestone 1 created</Text>
                  <Text style={styles.activityMeta}>8 Jul 2026 • 10:15 AM</Text>
                </View>
                <View style={[styles.activityBadge, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Text style={[styles.activityBadgeText, { color: '#D97706' }]}>Milestone</Text>
                </View>
              </View>
            </View>

            {/* Elevation Progress Map */}
            {sections.length > 0 && (
              <View style={[styles.porcelainCard, { marginTop: spacing.lg }]}>
                <Text style={{ fontSize: 14, fontFamily: fontFamily.semiBold, color: '#1E1815', marginBottom: 12 }}>
                  Elevation Progress Map
                </Text>
                <View style={{ gap: 6 }}>
                  {['L4', 'L3', 'L2', 'L1'].map(level => (
                    <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ width: 20, fontSize: 11, fontFamily: fontFamily.medium, color: '#695030' }}>{level}</Text>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                        {['BayA', 'BayB', 'BayC', 'BayD'].map(bay => {
                          const label = `${level}-${bay}`;
                          const sec = sections.find(s => s.label === label);
                          const statusColor = sec?.status === 'completed' ? '#16A34A' : (sec?.status === 'in_progress' ? '#CA8A04' : '#DC2626');
                          const statusBg = sec?.status === 'completed' ? 'rgba(22, 163, 74, 0.12)' : (sec?.status === 'in_progress' ? 'rgba(202, 138, 4, 0.12)' : 'rgba(220, 38, 38, 0.12)');
                          return (
                            <View
                              key={bay}
                              style={{
                                flex: 1,
                                height: 34,
                                backgroundColor: statusBg,
                                borderWidth: 1,
                                borderColor: statusColor,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 9, fontFamily: fontFamily.medium, color: '#1E1815' }}>{bay.replace('Bay', '')}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <AnimatedStateView
            type="empty"
            title="No Assigned Projects Found"
            message="Your project manager will connect your client account once structural glazing site setup begins."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.lg },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  brandLogoFrame: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 144, 71, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    boxShadow: '0px 6px 16px rgba(105, 80, 48, 0.1)',
  } as any,
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  greeting: { ...typography.h4, color: '#1E1815', fontFamily: fontFamily.semiBold },
  greetingSub: { ...typography.caption, color: '#695030', marginTop: 1, fontFamily: fontFamily.regular },
  onTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  onTrackDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  onTrackText: { ...typography.caption, color: '#16A34A', fontFamily: fontFamily.medium, fontSize: 11 },

  // Executive Quick Contact Action Bar
  quickActionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    boxShadow: '0px 4px 12px rgba(105, 80, 48, 0.08)',
  } as any,
  callBtn: {
    backgroundColor: 'rgba(105, 80, 48, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
  },
  callBtnText: { ...typography.button, color: '#695030', fontFamily: fontFamily.semiBold, fontSize: 12 },
  chatBtn: {
    backgroundColor: '#695030',
  },
  chatBtnText: { ...typography.button, color: '#FFFFFF', fontFamily: fontFamily.semiBold, fontSize: 12 },

  // SECTION 1: Double-Bezel (Doppelrand) Executive Hero Card
  heroShell: {
    backgroundColor: 'rgba(184, 144, 71, 0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.25)',
    padding: 6,
    marginBottom: spacing.lg,
    boxShadow: '0px 8px 24px rgba(105, 80, 48, 0.08)',
  } as any,

  heroCore: {
    backgroundColor: '#F5F2EC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: spacing.lg,
  },

  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eyebrowTag: {
    backgroundColor: 'rgba(105, 80, 48, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  eyebrowText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.semiBold, fontSize: 9, letterSpacing: 1.1 },

  todayDateText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.medium, fontSize: 11 },

  stagePill: {
    backgroundColor: 'rgba(105, 80, 48, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  stagePillText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.medium, fontSize: 11 },

  heroProjectName: { ...typography.h5, fontSize: 21, color: '#1E1815', fontFamily: fontFamily.semiBold },
  heroProjectMeta: { ...typography.bodySmall, color: '#695030', fontFamily: fontFamily.regular, marginTop: 2 },

  heroDivider: { height: 1, backgroundColor: 'rgba(105, 80, 48, 0.1)', marginVertical: spacing.md },

  heroContentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },

  // Executive Dual-Ring Gauge Wheel
  wheelWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelOuterTrack: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: 'rgba(105, 80, 48, 0.15)',
  },
  wheelArc: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderTopColor: 'transparent',
  },
  wheelCenter: { alignItems: 'center', justifyContent: 'center' },
  wheelPct: { ...typography.h5, fontSize: 19, color: '#1E1815', fontFamily: fontFamily.semiBold },
  wheelLabel: { ...typography.caption, color: '#695030', fontSize: 9, fontFamily: fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.5 },

  heroMetaList: { flex: 1, gap: 6 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroMetaLabel: { ...typography.caption, color: '#695030', width: 85, fontFamily: fontFamily.regular },
  heroMetaValue: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: '#1E1815', flex: 1, textTransform: 'capitalize' },

  // Site Today Card specifics
  siteWorkHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  siteWorkTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(105, 80, 48, 0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  siteWorkTypeText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.semiBold, fontSize: 11 },
  siteZoneText: { ...typography.caption, color: '#8B6840', fontFamily: fontFamily.medium, fontSize: 11 },
  siteWorkDesc: { ...typography.bodySmall, color: '#1E1815', fontFamily: fontFamily.regular, lineHeight: 20, marginBottom: spacing.md },

  viewTimelineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(105, 80, 48, 0.08)', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  viewTimelineText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.semiBold, fontSize: 11 },

  // 4 Stat Cards Bento Grid — Soft Porcelain Surfaces
  statsGrid: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F2EC',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    boxShadow: '0px 4px 12px rgba(105, 80, 48, 0.06)',
  } as any,
  statValue: { ...typography.h5, fontFamily: fontFamily.semiBold },
  statLabel: { ...typography.caption, color: '#695030', fontSize: 10, fontFamily: fontFamily.regular },
  statAccentTrack: { width: '100%', height: 3, backgroundColor: 'rgba(105, 80, 48, 0.12)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  statAccentFill: { height: '100%', borderRadius: 2 },

  // Porcelain Custom Card Surface
  porcelainCard: {
    backgroundColor: '#F5F2EC',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    boxShadow: '0px 6px 16px rgba(105, 80, 48, 0.08)',
  } as any,

  paymentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  paymentHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  paymentCardTitle: { ...typography.h6, color: '#1E1815', fontFamily: fontFamily.semiBold },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(105, 80, 48, 0.08)' },
  viewDetailsText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.medium, fontSize: 11 },
  paymentStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  paymentStatCol: { flex: 1, alignItems: 'center' },
  paymentDivider: { width: 1, height: 28, backgroundColor: 'rgba(105, 80, 48, 0.12)' },
  paymentStatLabel: { ...typography.caption, color: '#695030', fontSize: 9, fontFamily: fontFamily.medium, letterSpacing: 0.5, marginBottom: 2 },
  paymentStatValue: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, fontSize: 13 },
  paymentProgressTrack: { height: 8, backgroundColor: 'rgba(105, 80, 48, 0.1)', borderRadius: radius.full, overflow: 'hidden' },
  paymentProgressFill: { height: '100%', backgroundColor: '#695030', borderRadius: radius.full },
  paymentCollectedText: { ...typography.caption, color: '#695030', fontSize: 11, textAlign: 'right', marginTop: 4, fontFamily: fontFamily.regular },

  // Recent Activity Feed
  activityHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  activitySectionTitle: { ...typography.h6, color: '#1E1815', fontFamily: fontFamily.semiBold },
  viewAllText: { ...typography.bodySmall, color: '#695030', fontFamily: fontFamily.medium },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.md },
  activityRowDivider: { height: 1, backgroundColor: 'rgba(105, 80, 48, 0.08)', marginVertical: spacing.xs },
  activityIconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activityTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: '#1E1815' },
  activityMeta: { ...typography.caption, color: '#695030', marginTop: 2, fontSize: 11 },
  activityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  activityBadgeText: { ...typography.caption, fontSize: 10, fontFamily: fontFamily.medium },
});
