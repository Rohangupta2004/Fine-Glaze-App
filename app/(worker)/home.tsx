import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Avatar, StatusChip, Button, ProgressRing } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyTasks } from '../../src/hooks/useTasks';
import { useMyAssignedProjects } from '../../src/hooks/useAssignedProjects';
import { useTodayAttendance, usePunchOut } from '../../src/hooks/useAttendance';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';

const PRIORITY_COLOR: Record<string, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'worker.goodMorning';
  if (h < 17) return 'worker.goodAfternoon';
  return 'worker.goodEvening';
}

export default function WorkerHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  const firstName = profile?.full_name?.split(' ')[0] || 'Worker';

  const { data: tasks } = useMyTasks(profile?.id);
  const { data: projects } = useMyAssignedProjects(profile?.id);
  const { data: todayAttendance } = useTodayAttendance(profile?.id);
  const punchOut = usePunchOut();
  const activeProject = projects?.[0]; // Always use the worker's assigned site for geofence attendance.
  
  const totalTasks = tasks?.length || 0;
  const pendingTasksList = (tasks || []).filter((t) => t.status !== 'done');
  const doneTasks = totalTasks - pendingTasksList.length;
  const taskProgress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const pendingTasks = pendingTasksList.slice(0, 2);

  const hasPunchedIn = !!todayAttendance?.check_in_at;
  const hasPunchedOut = !!todayAttendance?.check_out_at;

  const handleAttendanceAction = () => {
    if (!hasPunchedIn) {
      router.push('/(worker)/punch-in' as any);
      return;
    }
    if (!hasPunchedOut && todayAttendance) {
      punchOut.mutate({ attendanceId: todayAttendance.id, checkInAt: todayAttendance.check_in_at });
    }
  };

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
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {t(getGreeting())}, {firstName} 👋
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.avatarWrap}
            onPress={() => router.push('/(worker)/profile' as any)}
          >
            <Avatar
              name={profile?.full_name || 'W'}
              uri={profile?.avatar_url}
              size={48}
            />
          </TouchableOpacity>
        </View>

        {/* Bento Grid — Site Info & Punch Row */}
        <View style={styles.bentoRow}>
          {/* Site Card */}
          <Card style={[styles.bentoCard, styles.siteCard]} padding={spacing.lg}>
            <Ionicons name="business" size={80} color={colors.primary} style={styles.siteWatermark} />
            <Text style={styles.bentoLabel}>{t('worker.todaysSite')}</Text>
            <Text style={styles.siteName} numberOfLines={2}>{activeProject?.name || '—'}</Text>
            <Text style={styles.siteDetail}>{activeProject?.city || '—'}</Text>
            <View style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
              <StatusChip status={activeProject?.status || 'on_track'} />
            </View>
          </Card>

          {/* Attendance Punch Card */}
          <TouchableOpacity
            style={[styles.bentoCard, styles.punchCard]}
            activeOpacity={0.85}
            disabled={hasPunchedOut || punchOut.isPending}
            onPress={handleAttendanceAction}
          >
            <LinearGradient
              colors={hasPunchedOut ? ['#10B981', '#059669'] : hasPunchedIn ? ['#D97706', '#B45309'] : ['#695030', '#918050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.punchInnerContent}>
              <View style={styles.punchIconCircle}>
                <Ionicons
                  name={hasPunchedOut ? 'checkmark-circle' : hasPunchedIn ? 'log-out-outline' : 'finger-print'}
                  size={32}
                  color={colors.white}
                />
              </View>
              <Text style={styles.punchStatusLabel}>
                {hasPunchedOut ? 'SHIFT ENDED' : hasPunchedIn ? 'PUNCHED IN' : 'TAP TO START'}
              </Text>
              <Text style={styles.punchActionText}>
                {punchOut.isPending
                  ? 'Saving…'
                  : hasPunchedOut
                    ? 'Shift Done'
                    : hasPunchedIn
                      ? 'Punch Out'
                      : t('worker.punchIn')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bento Task Overview Card */}
        <Card style={styles.taskBento} padding={spacing.lg}>
          <View style={styles.taskBentoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bentoLabel}>{t('worker.todaysTasks')}</Text>
              <Text style={styles.taskProgressText}>
                {totalTasks > 0 
                  ? `${doneTasks} of ${totalTasks} Completed`
                  : 'No Tasks Today'
                }
              </Text>
            </View>
            <ProgressRing 
              progress={taskProgress} 
              size={54} 
              strokeWidth={5} 
              subtitle=""
              startColor={colors.primary}
              endColor={colors.secondary}
            />
          </View>

          <View style={styles.taskDivider} />

          {pendingTasks.length === 0 ? (
            <Text style={styles.emptyTasksText}>{t('worker.noTasksToday', 'No pending tasks')}</Text>
          ) : (
            <View style={styles.taskList}>
              {pendingTasks.map((task) => (
                <View key={task.id} style={styles.taskListItem}>
                  <View style={[styles.priorityLine, { backgroundColor: PRIORITY_COLOR[task.priority] || colors.neutral[400] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskItemTitle} numberOfLines={1}>{task.title}</Text>
                    <Text style={styles.taskItemMeta}>{task.level_zone || 'General'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.seeAllBtn}
            onPress={() => router.push('/(worker)/tasks')}
          >
            <Text style={styles.seeAllText}>View All Tasks</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </Card>

      {/* Safety Banner */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(worker)/safety-checklist' as any)}>
        <LinearGradient
          colors={['#EA580C', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.safetyBanner}
        >
          <View style={styles.safetyRow}>
            <Ionicons name="shield-checkmark" size={32} color={colors.white} />
            <View style={styles.safetyText}>
              <Text style={styles.safetyTitle}>Daily Safety Checklist</Text>
              <Text style={styles.safetyDesc}>Confirm PPE check before shift</Text>
            </View>
            <View style={styles.safetyArrowWrap}>
              <Ionicons name="chevron-forward" size={16} color="#EA580C" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Emergency Contacts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
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
  avatarWrap: {
    boxShadow: '0px 4px 12px rgba(105, 80, 48, 0.15)',
    borderRadius: 24,
  },
  bentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  punchCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  punchIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  punchStatusLabel: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  punchActionText: {
    ...typography.h6,
    color: colors.white,
    fontFamily: fontFamily.bold,
  },
  taskBento: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  taskBentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskProgressText: {
    ...typography.h5,
    color: colors.ink,
    marginTop: 2,
  },
  taskDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing.md,
  },
  taskList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  taskListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priorityLine: {
    width: 3,
    height: 32,
    borderRadius: 1.5,
  },
  taskItemTitle: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  taskItemMeta: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  emptyTasksText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  seeAllText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  safetyBanner: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.md,
    marginBottom: spacing.xl,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  safetyText: {
    flex: 1,
  },
  safetyTitle: {
    ...typography.h6,
    fontFamily: fontFamily.bold,
    color: colors.white,
    marginBottom: 2,
  },
  safetyDesc: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  safetyArrowWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
