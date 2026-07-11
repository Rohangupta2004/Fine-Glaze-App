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

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import {
  useProjectTasks,
  useUpdateTaskStatus,
  useCreateTask,
} from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../../src/theme/spacing';
import type { TaskStatus, TaskPriority } from '../../src/types';

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
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();
  const activeProject = (projects || [])[0];

  const { data: tasks, refetch, isRefetching } = useProjectTasks(activeProject?.id);
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();

  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);

  // Create task form state
  const [newTitle, setNewTitle] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newAssignee, setNewAssignee] = useState<string>('');

  const workers = (employees || []).filter((e) => e.role === 'worker' || e.role === 'supervisor');

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

  const handleCreate = async () => {
    if (!newTitle.trim() || !profile?.id || !activeProject?.id) return;
    try {
      await createTask.mutateAsync({
        projectId: activeProject.id,
        createdBy: profile.id,
        title: newTitle.trim(),
        assignedTo: newAssignee || null,
        levelZone: newZone.trim() || null,
        priority: newPriority,
      });
      setShowCreate(false);
      setNewTitle(''); setNewZone(''); setNewPriority('medium'); setNewAssignee('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create task');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => setShowCreate(true)}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Project label */}
      {activeProject && (
        <Text style={styles.projectLabel}>{activeProject.name}</Text>
      )}

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
                onPress={() => setShowCreate(true)}
                variant="secondary"
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TouchableOpacity
              onPress={() => setShowCreate(false)}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={26} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalForm}
            keyboardShouldPersistTaps="handled"
          >
            <Input
              label="Task Title *"
              placeholder="Describe what needs to be done"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <View style={styles.formGap} />
            <Input
              label="Level / Zone"
              placeholder="e.g. Level 4 - East Wing"
              value={newZone}
              onChangeText={setNewZone}
            />
            <View style={styles.formGap} />

            {/* Priority */}
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    newPriority === p && { backgroundColor: PRIORITY_COLOR[p] },
                  ]}
                  onPress={() => setNewPriority(p)}
                  hitSlop={4}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      newPriority === p && { color: colors.white },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGap} />

            {/* Assignee */}
            <Text style={styles.fieldLabel}>Assign To</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.assigneeRow}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              <TouchableOpacity
                style={[
                  styles.assigneeChip,
                  !newAssignee && styles.assigneeChipActive,
                ]}
                onPress={() => setNewAssignee('')}
              >
                <Text style={[styles.assigneeText, !newAssignee && styles.assigneeTextActive]}>
                  Unassigned
                </Text>
              </TouchableOpacity>
              {workers.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.assigneeChip,
                    newAssignee === w.id && styles.assigneeChipActive,
                  ]}
                  onPress={() => setNewAssignee(w.id)}
                >
                  <Text
                    style={[
                      styles.assigneeText,
                      newAssignee === w.id && styles.assigneeTextActive,
                    ]}
                  >
                    {w.full_name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ height: spacing.xl }} />

            <Button
              title="Create Task"
              onPress={handleCreate}
              loading={createTask.isPending}
              disabled={!newTitle.trim()}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.h3, color: colors.ink },
  addTaskBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  projectLabel: { ...typography.caption, color: colors.neutral[500], marginBottom: spacing.lg },
  filterRow: { marginBottom: spacing.md, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: spacing.lg,
    height: TOUCH_TARGET - 8,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: colors.white },
  list: { paddingBottom: spacing['6xl'] },
  taskCard: { marginBottom: spacing.sm },
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
});
