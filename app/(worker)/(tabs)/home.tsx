import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Avatar, StatusChip, Button, ProgressRing, ShiftCheckOutModal } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/authStore';
import { useMyTasks, useUpdateTaskStatus } from '../../../src/hooks/useTasks';
import { usePersonalTodos, useTogglePersonalTodo } from '../../../src/hooks/usePersonalTodos';
import { useMyAssignedProjects } from '../../../src/hooks/useAssignedProjects';
import { useTodayAttendance, usePunchOut } from '../../../src/hooks/useAttendance';
import { colors } from '../../../src/theme/colors';
import { typography, fontFamily } from '../../../src/theme/typography';
import { spacing, radius, shadows } from '../../../src/theme/spacing';

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
  const userId = useAuthStore((s) => s.userId);
  const effectiveId = profile?.id || userId;

  const firstName = profile?.full_name?.split(' ')[0] || 'Worker';

  const { data: tasks, refetch: refetchTasks, isRefetching: isRefetchingTasks } = useMyTasks(effectiveId);
  const { data: todos, refetch: refetchTodos, isRefetching: isRefetchingTodos } = usePersonalTodos(effectiveId);
  const toggleTodo = useTogglePersonalTodo();
  const updateTaskStatus = useUpdateTaskStatus();
  const { data: projects } = useMyAssignedProjects(effectiveId);
  const { data: todayAttendance } = useTodayAttendance(effectiveId);
  const punchOut = usePunchOut();
  const [showCheckOutModal, setShowCheckOutModal] = React.useState(false);

  const assignedProjects = projects || [];
  const activeProject = (todayAttendance?.project_id ? assignedProjects.find(p => p.id === todayAttendance.project_id) : null) || assignedProjects[0];
  
  const isTaskDone = (s?: string) => s === 'done' || s === 'completed';
  const totalTasks = tasks?.length || 0;
  const pendingTasksList = (tasks || []).filter((t) => !isTaskDone(t.status));
  const doneTasks = totalTasks - pendingTasksList.length;

  const totalTodos = todos?.length || 0;
  const pendingTodosList = (todos || []).filter((t) => !t.completed_at);
  const doneTodos = totalTodos - pendingTodosList.length;

  const combinedTotal = totalTasks + totalTodos;
  const combinedDone = doneTasks + doneTodos;
  const taskProgress = combinedTotal > 0 ? (combinedDone / combinedTotal) * 100 : 0;

  // Show up to 4 total pending items (tasks + todos) so newly added tasks are displayed
  const displayTasks = pendingTasksList.slice(0, 4);
  const displayTodos = displayTasks.length < 4 ? pendingTodosList.slice(0, 4 - displayTasks.length) : [];

  const hasPunchedIn = !!todayAttendance?.check_in_at;
  const hasPunchedOut = !!todayAttendance?.check_out_at;

  const [shiftTimer, setShiftTimer] = React.useState('00h 00m 00s');

  React.useEffect(() => {
    if (!todayAttendance?.check_in_at) {
      setShiftTimer('00h 00m 00s');
      return;
    }

    const checkInMs = new Date(todayAttendance.check_in_at).getTime();
    const checkOutMs = todayAttendance.check_out_at ? new Date(todayAttendance.check_out_at).getTime() : null;

    const calcTimer = () => {
      const targetMs = checkOutMs || Date.now();
      const diffMs = Math.max(0, targetMs - checkInMs);
      const secs = Math.floor((diffMs / 1000) % 60);
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      setShiftTimer(
        `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      );
    };

    calcTimer();
    if (!checkOutMs) {
      const interval = setInterval(calcTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [todayAttendance?.check_in_at, todayAttendance?.check_out_at]);

  const handleAttendanceAction = () => {
    if (!hasPunchedIn || hasPunchedOut) {
      router.push('/(worker)/punch-in' as any);
      return;
    }
    if (hasPunchedIn && !hasPunchedOut && todayAttendance) {
      setShowCheckOutModal(true);
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
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingTasks || isRefetchingTodos}
            onRefresh={() => {
              refetchTasks();
              refetchTodos();
            }}
            tintColor={colors.primary}
          />
        }
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <TouchableOpacity 
              style={styles.notificationBell}
              onPress={() => router.push('/(worker)/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.ink} />
            </TouchableOpacity>
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
        </View>


        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <LinearGradient
            colors={hasPunchedOut ? ['#065F46', '#047857'] : hasPunchedIn ? ['#B45309', '#D97706'] : ['#854D0E', '#A16207']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: radius.xl,
              padding: spacing.lg,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="location" size={16} color={hasPunchedIn ? '#10B981' : '#F59E0B'} />
                  <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: hasPunchedIn ? '#A7F3D0' : '#FCD34D', letterSpacing: 0.8 }}>
                    {hasPunchedOut ? 'SHIFT 1 COMPLETED' : hasPunchedIn ? 'ACTIVE SITE WORKSPACE' : 'TODAY\'S ASSIGNED SITE'}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#FFFFFF', marginBottom: 2 }} numberOfLines={1}>
                  {activeProject?.name || 'No Site Assigned'}
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: hasPunchedOut ? '#10B981' : hasPunchedIn ? '#D97706' : '#695030',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                disabled={punchOut.isPending}
                onPress={handleAttendanceAction}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={hasPunchedOut ? 'add-circle-outline' : hasPunchedIn ? 'log-out-outline' : 'finger-print'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#FFFFFF' }}>
                  {hasPunchedOut ? 'Punch In (2nd Shift)' : hasPunchedIn ? 'Punch Out' : 'Punch In'}
                </Text>
              </TouchableOpacity>
            </View>

            {hasPunchedIn ? (
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={hasPunchedOut ? "checkmark-circle-outline" : "stopwatch-outline"} size={16} color={hasPunchedOut ? "#A7F3D0" : "#FCD34D"} />
                  <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: hasPunchedOut ? "#A7F3D0" : "#FCD34D", letterSpacing: 0.5 }}>
                    {hasPunchedOut ? "SHIFT 1 DONE • TAP TO START NEXT SHIFT" : "LIVE SHIFT TRACKING"}
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full }}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#FFFFFF' }}>
                    ⏱️ {shiftTimer}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle-outline" size={15} color="#FCD34D" />
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', flex: 1 }}>
                  Punch in within site geofence to activate today's site tasks & DPR submission.
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Worker Quick Actions Grid */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
          <Text style={styles.sectionTitle}>WORKER QUICK ACTIONS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {[
              { label: 'Submit DPR', icon: 'document-text', route: '/(worker)/dpr', color: colors.primary, bg: '#F6F3EC' },
              { label: 'My Site Scope', icon: 'business', route: '/(worker)/my-site', color: '#0284C7', bg: '#E0F2FE' },
              { label: 'Attendance', icon: 'finger-print', route: '/(worker)/attendance', color: '#16A34A', bg: '#DCFCE7' },
              { label: 'Drawings & Docs', icon: 'folder-open', route: '/(worker)/documents', color: '#9333EA', bg: '#F3E8FF' },
              { label: 'Safety Checklist', icon: 'shield-checkmark', route: '/(worker)/safety-checklist', color: '#EA580C', bg: '#FFEDD5' },
              { label: 'Apply Leave', icon: 'calendar-outline', route: '/(worker)/leave-request', color: '#D97706', bg: '#FEF3C7' },
            ].map((act, i) => (
              <TouchableOpacity
                key={i}
                style={{
                  width: '31%',
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 12,
                  paddingHorizontal: 6,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  opacity: !hasPunchedIn && act.route === '/(worker)/dpr' ? 0.6 : 1,
                }}
                activeOpacity={0.8}
                onPress={() => router.push(act.route as any)}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: act.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name={act.icon as any} size={20} color={act.color} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.ink, textAlign: 'center' }}>
                  {act.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bento Task Overview Card */}
        <Card style={[styles.taskBento, { overflow: 'hidden' }]} padding={spacing.lg}>
          <LinearGradient colors={['#FFFFFF', '#F6F3EC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.taskBentoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bentoLabel}>{t('worker.todaysTasks')}</Text>
              <Text style={styles.taskProgressText}>
                {combinedTotal > 0 
                  ? `${combinedDone} of ${combinedTotal} Completed`
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

          {displayTasks.length === 0 && displayTodos.length === 0 ? (
            <Text style={styles.emptyTasksText}>{t('worker.noTasksToday', 'No pending tasks')}</Text>
          ) : (
            <View style={styles.taskList}>
              {/* Render Project Tasks */}
              {displayTasks.map((task) => (
                <View key={task.id} style={styles.taskListItem}>
                  <View style={[styles.priorityLine, { backgroundColor: PRIORITY_COLOR[task.priority] || colors.neutral[400] }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.taskItemTitle} numberOfLines={1}>{task.title}</Text>
                      <View style={styles.typeBadgeTask}>
                        <Text style={styles.typeBadgeText}>Task</Text>
                      </View>
                    </View>
                    <Text style={styles.taskItemMeta}>{task.level_zone || 'General'}</Text>
                  </View>
                </View>
              ))}

              {/* Render Personal To-Dos */}
              {displayTodos.map((todo) => (
                <View key={todo.id} style={styles.taskListItem}>
                  <TouchableOpacity
                    style={{ marginRight: spacing.xs, marginTop: 2 }}
                    onPress={() => toggleTodo.mutate({ id: todo.id, completed: true })}
                  >
                    <Ionicons name="square-outline" size={18} color={colors.neutral[400]} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.taskItemTitle} numberOfLines={1}>{todo.title}</Text>
                      <View style={styles.typeBadgeTodo}>
                        <Text style={styles.typeBadgeText}>To-Do</Text>
                      </View>
                    </View>
                    <Text style={styles.taskItemMeta}>{todo.due_date ? `Due: ${todo.due_date}` : 'Personal'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.seeAllBtn}
            onPress={() => router.push('/(worker)/tasks' as any)}
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

    <ShiftCheckOutModal
      visible={showCheckOutModal}
      onClose={() => setShowCheckOutModal(false)}
      onConfirmPunchOut={() => {
        if (todayAttendance) {
          punchOut.mutate({ attendanceId: todayAttendance.id, checkInAt: todayAttendance.check_in_at });
        }
        setShowCheckOutModal(false);
      }}
      isPunchingOut={punchOut.isPending}
      pendingTasks={pendingTasksList}
      onToggleTaskDone={(taskId) => {
        updateTaskStatus.mutate({ taskId, status: 'done' });
      }}
      hasSubmittedDpr={false}
      onNavigateDpr={() => {
        setShowCheckOutModal(false);
        router.push('/(worker)/dpr' as any);
      }}
    />
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
  notificationBell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  typeBadgeTask: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeTodo: {
    backgroundColor: '#3B82F615',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: colors.ink,
    textTransform: 'uppercase',
  },
});
