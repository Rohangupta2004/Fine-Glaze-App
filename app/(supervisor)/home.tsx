import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Avatar, StatusChip } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { usePendingMaterialRequests } from '../../src/hooks/useApprovals';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function SupervisorHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Supervisor';

  const { data: projects, refetch: rP, isRefetching: r1 } = useProjects();
  const { data: employees, refetch: rE, isRefetching: r2 } = useEmployees();
  const { data: pendingMaterials } = usePendingMaterialRequests();

  const activeProject = (projects || [])[0];
  const workers = (employees || []).filter(e => e.role === 'worker');
  const activeWorkers = workers.filter(e => e.status === 'active');
  const onLeaveWorkers = workers.filter(e => e.status === 'on_leave');

  const onRefresh = () => { rP(); rE(); };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: spacing['6xl'],
        }}
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
          <Avatar name={profile?.full_name || 'S'} uri={profile?.avatar_url} size={48} />
        </View>

        {/* Bento Grid — Today's Site & Team Stats */}
        <View style={styles.bentoRow}>
          {/* Site Card */}
          {activeProject ? (
            <Card style={[styles.bentoCard, styles.siteCard]} padding={spacing.lg}>
              <Ionicons name="business" size={80} color={colors.primary} style={styles.siteWatermark} />
              <Text style={styles.bentoLabel}>Today's Site</Text>
              <Text style={styles.siteName} numberOfLines={2}>{activeProject.name}</Text>
              <Text style={styles.siteDetail}>{activeProject.city}</Text>
              <View style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
                <StatusChip status={activeProject.status} />
              </View>
            </Card>
          ) : (
            <Card style={[styles.bentoCard, styles.siteCard]} padding={spacing.lg}>
              <Text style={styles.bentoLabel}>Today's Site</Text>
              <Text style={styles.siteName}>No Active Site</Text>
            </Card>
          )}

          {/* Team Attendance Overview Card */}
          <Card style={[styles.bentoCard, styles.statsCard]} padding={spacing.lg}>
            <Text style={styles.bentoLabel}>Team Today</Text>
            <View style={styles.statsSummary}>
              <View style={styles.statMini}>
                <Text style={[styles.statMiniNum, { color: colors.success }]}>{activeWorkers.length}</Text>
                <Text style={styles.statMiniLabel}>Present</Text>
              </View>
              <View style={styles.statMiniLine} />
              <View style={styles.statMini}>
                <Text style={[styles.statMiniNum, { color: colors.warning }]}>{onLeaveWorkers.length}</Text>
                <Text style={styles.statMiniLabel}>Leave</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.statsLink}
              onPress={() => router.push('/(supervisor)/team-attendance')}
            >
              <Text style={styles.statsLinkText}>Manage Attendance</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Team Members List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👷 Team Attendance</Text>
          <TouchableOpacity onPress={() => router.push('/(supervisor)/team-attendance')}>
            <Text style={styles.seeAll}>See details</Text>
          </TouchableOpacity>
        </View>

        {workers.length === 0 ? (
          <Card style={styles.emptyCard} padding={spacing.lg}>
            <Text style={styles.emptyText}>No team members assigned</Text>
          </Card>
        ) : (
          <View style={styles.workerList}>
            {workers.slice(0, 3).map((w) => (
              <Card key={w.id} style={styles.workerCard} padding={spacing.md}>
                <View style={styles.workerRow}>
                  <Avatar name={w.full_name} uri={w.avatar_url} size={40} />
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{w.full_name}</Text>
                    <Text style={styles.workerMeta}>{w.worker_id || w.role}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: w.status === 'active' ? colors.successBg : colors.neutral[100] }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: w.status === 'active' ? colors.success : colors.neutral[500] }
                    ]}>
                      {w.status === 'active' ? 'Present' : 'On Leave'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Materials */}
        {(pendingMaterials?.length || 0) > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 Pending Material Requests</Text>
              <TouchableOpacity onPress={() => router.push('/(supervisor)/materials')}>
                <Text style={styles.seeAll}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.materialList}>
              {(pendingMaterials || []).slice(0, 2).map((m) => (
                <Card key={m.id} style={styles.materialCard} padding={spacing.md}>
                  <View style={styles.materialRow}>
                    <View style={styles.materialIconWrap}>
                      <Ionicons name="cube" size={20} color={colors.pending} />
                    </View>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName}>{m.material_name}</Text>
                      <Text style={styles.materialMeta}>Qty: {m.qty}{m.needed_by ? ` · By ${new Date(m.needed_by).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
                      <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Emergency Contacts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚨 Emergency Contacts</Text>
        </View>
        <Card style={styles.emergencyCard} padding={spacing.md}>
          <EmergencyRow icon="shield" label="Site Safety Officer" phone="100" />
          <View style={styles.emergencyDivider} />
          <EmergencyRow icon="medkit" label="Ambulance" phone="108" />
          <View style={styles.emergencyDivider} />
          <EmergencyRow icon="alert-circle" label="National Emergency" phone="112" />
        </Card>
      </ScrollView>
    </View>
  );
}

function EmergencyRow({ icon, label, phone }: { icon: string; label: string; phone: string }) {
  return (
    <View style={styles.emergencyRow}>
      <View style={styles.emergencyIconWrap}>
        <Ionicons name={icon as any} size={18} color={colors.error} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.emergencyLabel}>{label}</Text>
        <Text style={styles.emergencyPhone}>{phone}</Text>
      </View>
      <TouchableOpacity
        style={styles.emergencyCallBtn}
        onPress={() => Linking.openURL(`tel:${phone}`)}
        accessibilityLabel={`Call ${label}`}
        hitSlop={8}
      >
        <Ionicons name="call" size={16} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.ink,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  date: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    fontFamily: fontFamily.medium,
  },
  bentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  bentoCard: {
    flex: 1,
    height: 160,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
  },
  siteWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    opacity: 0.05,
  },
  bentoLabel: {
    ...typography.caption,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: fontFamily.medium,
    marginBottom: spacing.xs,
  },
  siteName: {
    ...typography.h5,
    color: colors.ink,
    lineHeight: 22,
  },
  siteDetail: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    marginTop: spacing.xs,
  },
  statMini: {
    alignItems: 'center',
  },
  statMiniNum: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
  },
  statMiniLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statMiniLine: {
    width: 1,
    height: 36,
    backgroundColor: colors.neutral[100],
  },
  statsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  statsLinkText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.ink,
    fontFamily: fontFamily.bold,
  },
  seeAll: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
  },
  workerList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  workerMeta: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
  },
  materialList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  materialIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.pendingBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  materialMeta: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  emergencyCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing['4xl'],
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  emergencyDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing.xs,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  emergencyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyLabel: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  emergencyPhone: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  emergencyCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
