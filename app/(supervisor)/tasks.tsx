import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import {
  useProjectTasks,
  useUpdateTaskStatus,
  useCreateTask,
  useMyTasks,
  useUpdateTaskChecklist,
} from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../../src/theme/spacing';
import type { TaskStatus, TaskPriority, Task } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

const FILTERS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Done', value: 'done' },
  { label: 'Blocked', value: 'blocked' },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

const PRIORITY_OPTIONS: TaskPriority[] = ['high', 'medium', 'low'];

export default function SupervisorTasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();
  const activeProject = (projects || [])[0];

  const { data: projectTasks = [], refetch: refetchProject, isRefetching: isRefetchingProject } = useProjectTasks(activeProject?.id);
  const { data: myTasks = [], refetch: refetchMine, isRefetching: isRefetchingMine } = useMyTasks(profile?.id);

  const tasks = React.useMemo(() => {
    const map = new Map<string, Task>();
    projectTasks.forEach(t => map.set(t.id, t));
    myTasks.forEach(t => {
      if (!map.has(t.id)) map.set(t.id, t);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.window_start && b.window_start) {
        return new Date(a.window_start).getTime() - new Date(b.window_start).getTime();
      }
      return 0;
    });
  }, [projectTasks, myTasks]);

  const isRefetching = isRefetchingProject || isRefetchingMine;
  const refetch = () => { refetchProject(); refetchMine(); };
  const updateStatus = useUpdateTaskStatus();
  const updateChecklist = useUpdateTaskChecklist();

  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const filtered = (tasks || []).filter(
    (t) => filter === 'all' || t.status === filter,
  );

  const handleToggleDone = (taskId: string, current: TaskStatus) => {
    const next: TaskStatus = current === 'done' ? 'pending' : 'done';
    updateStatus.mutate({ taskId, status: next });
  };

  const handleMarkBlocked = (taskId: string, current: TaskStatus) => {
    const next: TaskStatus = current === 'blocked' ? 'pending' : 'blocked';
    updateStatus.mutate({ taskId, status: next });
  };



  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#695030', '#7E6144', '#918050']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrap, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tasks</Text>
            {activeProject && (
              <Text style={styles.projectLabel}>{activeProject.name}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.addTaskBtn}
            onPress={() => router.push('/create-task')}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
            hitSlop={4}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {filtered.map((task) => (
          <Card key={task.id} style={styles.taskCard} variant="interactive" padding={spacing.lg}>
            <View style={styles.taskRow}>
              {/* Done toggle */}
              <TouchableOpacity
                onPress={() => handleToggleDone(task.id, task.status)}
                hitSlop={8}
                style={styles.checkBtn}
              >
                <Ionicons
                  name={task.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={task.status === 'done' ? colors.success : colors.neutral[400]}
                />
              </TouchableOpacity>

              <View style={styles.taskInfo}>
                <Text style={[styles.taskTitle, task.status === 'done' && styles.taskDone]}>
                  {task.title}
                </Text>
                <View style={styles.taskMeta}>
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: PRIORITY_COLOR[task.priority] || colors.neutral[400] },
                    ]}
                  />
                  <Text style={styles.taskMetaText}>{task.priority}</Text>
                  {task.level_zone && (
                    <Text style={styles.taskMetaText}> · {task.level_zone}</Text>
                  )}
                </View>

                {/* Checklist Section */}
                {task.checklist && task.checklist.length > 0 && (
                  <View style={styles.checklistContainer}>
                    {task.checklist.map((checkItem: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.checklistItem}
                        onPress={() => {
                          const newChecklist = [...task.checklist!];
                          newChecklist[index] = { ...checkItem, done: !checkItem.done };
                          updateChecklist.mutate({ taskId: task.id, checklist: newChecklist });
                        }}
                      >
                        <Ionicons
                          name={checkItem.done ? 'checkmark-circle' : 'square-outline'}
                          size={18}
                          color={checkItem.done ? colors.success : colors.neutral[400]}
                        />
                        <Text style={[styles.checklistText, checkItem.done && styles.checklistTextDone]}>
                          {checkItem.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Blocked toggle */}
              <TouchableOpacity
                onPress={() => handleMarkBlocked(task.id, task.status)}
                hitSlop={8}
                style={styles.blockBtn}
              >
                {task.status === 'blocked' ? (
                  <View style={styles.blockedBadge}>
                    <Text style={styles.blockedText}>Blocked</Text>
                  </View>
                ) : (
                  <Ionicons name="warning-outline" size={20} color={colors.neutral[300]} />
                )}
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
            </Text>
            {filter === 'all' && (
              <Button
                title="Create Task"
                onPress={() => router.push('/create-task')}
                variant="secondary"
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.h4, color: '#fff' },
  addTaskBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  projectLabel: { ...typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  filterRow: { marginTop: spacing.md, marginBottom: spacing.md, flexGrow: 0, paddingHorizontal: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.lg,
    height: TOUCH_TARGET - 8,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: colors.white },
  list: { paddingBottom: spacing['6xl'], paddingHorizontal: spacing.lg },
  taskCard: { marginBottom: spacing.sm, backgroundColor: '#fff', borderRadius: radius.xl },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: { flex: 1 },
  taskTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  taskDone: { textDecorationLine: 'line-through', color: colors.neutral[400] },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskMetaText: { ...typography.caption, color: colors.neutral[500], textTransform: 'capitalize' },
  blockBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedBadge: {
    backgroundColor: colors.errorBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  blockedText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.error },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },

  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  modalTitle: { flex: 1, ...typography.h5, color: colors.ink },
  closeBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modalForm: { padding: spacing.lg, paddingBottom: spacing['6xl'] },
  formGap: { height: spacing.md },
  fieldLabel: { ...typography.label, color: colors.ink, marginBottom: spacing.sm },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priorityChip: {
    paddingHorizontal: spacing.lg,
    height: TOUCH_TARGET - 8,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  priorityChipText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
    textTransform: 'capitalize',
  },
  assigneeRow: { flexGrow: 0, marginBottom: spacing.sm },
  assigneeChip: {
    paddingHorizontal: spacing.md,
    height: TOUCH_TARGET - 8,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  assigneeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  assigneeText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  assigneeTextActive: { color: colors.white },
  checklistContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  checklistText: {
    ...typography.bodySmall,
    color: colors.ink,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: colors.neutral[400],
  },
});
