import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyTasks, useUpdateTaskStatus } from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

type TabKey = 'today' | 'completed';

const PRIORITY_COLORS: Record<string, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const profile = useAuthStore((s) => s.profile);
  const { data: allTasks, isLoading } = useMyTasks(profile?.id);
  const updateStatus = useUpdateTaskStatus();

  const tasks = (allTasks || []).filter((task) =>
    activeTab === 'today' ? task.status !== 'done' : task.status === 'done'
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>{t('worker.myTasks')}</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['today', 'completed'] as TabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {t(`worker.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task list */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={styles.taskCard} variant="interactive">
            <View style={styles.taskRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  updateStatus.mutate({
                    taskId: item.id,
                    status: item.status === 'done' ? 'pending' : 'done',
                  })
                }
              >
                {item.status === 'done' ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                ) : (
                  <View style={[styles.checkboxInner, { borderColor: PRIORITY_COLORS[item.priority] }]} />
                )}
              </TouchableOpacity>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <View style={styles.taskMeta}>
                  <Ionicons name="location-outline" size={12} color={colors.neutral[400]} />
                  <Text style={styles.taskZone}>{item.level_zone || '—'}</Text>
                  <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLORS[item.priority] + '18' }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>
                      {item.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>{isLoading ? 'Loading…' : 'No tasks'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  activeTab: {
    backgroundColor: colors.white,
  },
  tabText: {
    ...typography.buttonSmall,
    color: colors.neutral[500],
  },
  activeTabText: {
    color: colors.primary,
  },
  listContent: {
    paddingBottom: spacing['5xl'],
  },
  taskCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    marginTop: 2,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskZone: {
    ...typography.caption,
    color: colors.neutral[500],
    marginRight: spacing.sm,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priorityText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    textTransform: 'capitalize',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['6xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.neutral[400],
  },
});
