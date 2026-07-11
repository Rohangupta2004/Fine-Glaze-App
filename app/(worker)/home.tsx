import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, StatusChip, Button } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyTasks } from '../../src/hooks/useTasks';
import { useProjects } from '../../src/hooks/useProjects';
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
  const { data: projects } = useProjects();
  const { data: todayAttendance } = useTodayAttendance(profile?.id);
  const punchOut = usePunchOut();
  const activeProject = projects?.[0]; // Single active project per worker in M1
  const pendingTasks = (tasks || []).filter((t) => t.status !== 'done').slice(0, 3);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: spacing['5xl'],
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
        <TouchableOpacity>
          <Avatar
            name={profile?.full_name || 'W'}
            uri={profile?.avatar_url}
            size={44}
          />
        </TouchableOpacity>
      </View>

      {/* Today's Site Card */}
      <Card style={styles.siteCard}>
        <View style={styles.siteHeader}>
          <View style={styles.siteInfo}>
            <Text style={styles.siteLabel}>{t('worker.todaysSite')}</Text>
            <Text style={styles.siteName}>{activeProject?.name || '—'}</Text>
            <Text style={styles.siteDetail}>{activeProject?.stage || ''}</Text>
          </View>
          <StatusChip status={activeProject?.status || 'on_track'} />
        </View>

        <View style={styles.siteStats}>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.statText}>{activeProject?.city || '—'}</Text>
          </View>
        </View>

        {/* Punch In Button */}
        <TouchableOpacity
          style={[styles.punchButton, hasPunchedOut && styles.punchButtonDone]}
          activeOpacity={0.8}
          disabled={hasPunchedOut || punchOut.isPending}
          onPress={handleAttendanceAction}
        >
          <View style={styles.punchInner}>
            <Ionicons
              name={hasPunchedOut ? 'checkmark-circle' : hasPunchedIn ? 'log-out-outline' : 'finger-print'}
              size={28}
              color={colors.white}
            />
            <Text style={styles.punchText}>
              {punchOut.isPending
                ? 'Saving…'
                : hasPunchedOut
                  ? 'Shift Completed'
                  : hasPunchedIn
                    ? 'Punch Out'
                    : t('worker.punchIn')}
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

      {/* Today's Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('worker.todaysTasks')}</Text>
        <TouchableOpacity onPress={() => router.push('/(worker)/tasks')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {pendingTasks.length === 0 && (
        <Card style={styles.taskCard} variant="flat">
          <Text style={styles.taskMeta}>{t('worker.noTasksToday', 'No tasks assigned yet')}</Text>
        </Card>
      )}
      {pendingTasks.map((task) => (
        <Card key={task.id} style={styles.taskCard} variant="interactive">
          <View style={styles.taskRow}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: PRIORITY_COLOR[task.priority] || colors.neutral[400] },
              ]}
            />
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskMeta}>
                {[task.level_zone, `${task.priority} priority`].filter(Boolean).join(' • ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </View>
        </Card>
      ))}

      {/* Safety Banner */}
      <Card
        style={styles.safetyBanner}
        variant="flat"
        onPress={() => router.push('/(worker)/safety-checklist' as any)}
      >
        <View style={styles.safetyRow}>
          <Ionicons name="shield-checkmark" size={24} color={colors.warning} />
          <View style={styles.safetyText}>
            <Text style={styles.safetyTitle}>Daily Safety Checklist</Text>
            <Text style={styles.safetyDesc}>Complete before starting work</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.h4,
    color: colors.ink,
    marginBottom: 2,
  },
  date: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  siteCard: {
    marginBottom: spacing['2xl'],
    padding: spacing.xl,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  siteInfo: {
    flex: 1,
  },
  siteLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  siteName: {
    ...typography.h4,
    color: colors.ink,
    marginBottom: 2,
  },
  siteDetail: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
  siteStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  punchButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  punchButtonDone: {
    backgroundColor: colors.success,
  },
  punchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  punchText: {
    ...typography.button,
    color: colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.ink,
  },
  seeAll: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  taskCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  taskMeta: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  safetyBanner: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
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
    color: colors.ink,
  },
  safetyDesc: {
    ...typography.caption,
    color: colors.neutral[600],
  },
});
