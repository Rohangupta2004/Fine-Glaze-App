import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyTasks, useUpdateTaskStatus } from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { TaskStatus } from '../../src/types';

const FILTERS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Done', value: 'done' },
  { label: 'Blocked', value: 'blocked' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

export default function SupervisorTasksScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { data: tasks, refetch, isRefetching } = useMyTasks(profile?.id);
  const updateStatus = useUpdateTaskStatus();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const filtered = (tasks || []).filter(t => filter === 'all' || t.status === filter);

  const toggleDone = (taskId: string, current: TaskStatus) => {
    const next: TaskStatus = current === 'done' ? 'pending' : 'done';
    updateStatus.mutate({ taskId, status: next });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Tasks</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {filtered.map((task) => (
          <Card key={task.id} style={styles.taskCard} variant="interactive">
            <View style={styles.taskRow}>
              <TouchableOpacity onPress={() => toggleDone(task.id, task.status)} hitSlop={8}>
                <Ionicons
                  name={task.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={task.status === 'done' ? colors.success : colors.neutral[400]}
                />
              </TouchableOpacity>
              <View style={styles.taskInfo}>
                <Text style={[styles.taskTitle, task.status === 'done' && styles.taskDone]}>{task.title}</Text>
                <View style={styles.taskMeta}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority] || colors.neutral[400] }]} />
                  <Text style={styles.taskMetaText}>{task.priority}</Text>
                  {task.level_zone && <Text style={styles.taskMetaText}> · {task.level_zone}</Text>}
                </View>
              </View>
              {task.status === 'blocked' && (
                <View style={[styles.blockedBadge]}>
                  <Text style={styles.blockedText}>Blocked</Text>
                </View>
              )}
            </View>
          </Card>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>{filter === 'all' ? 'No tasks assigned' : `No ${filter} tasks`}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink, marginBottom: spacing.lg },
  filterRow: { marginBottom: spacing.lg, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: colors.white },
  taskCard: { padding: spacing.lg, marginBottom: spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  taskInfo: { flex: 1 },
  taskTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  taskDone: { textDecorationLine: 'line-through', color: colors.neutral[400] },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskMetaText: { ...typography.caption, color: colors.neutral[500], textTransform: 'capitalize' },
  blockedBadge: { backgroundColor: colors.errorBg, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  blockedText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.error },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
