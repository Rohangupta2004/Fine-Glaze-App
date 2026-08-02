import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/authStore';
import { useMyTasks, useUpdateTaskStatus, useUpdateTaskChecklist } from '../../../src/hooks/useTasks';
import { colors } from '../../../src/theme/colors';
import { typography, fontFamily } from '../../../src/theme/typography';
import { spacing, radius } from '../../../src/theme/spacing';

type TabKey = 'today' | 'completed';

const PRIORITY_COLORS: Record<string, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.userId);
  const effectiveId = profile?.id || userId;

  const { data: allTasks, isLoading, refetch, isRefetching } = useMyTasks(effectiveId);
  const updateStatus = useUpdateTaskStatus();
  const updateChecklist = useUpdateTaskChecklist();

  const isTaskDone = (status?: string) => status === 'done' || status === 'completed';

  const tasks = (allTasks || []).filter((task) =>
    activeTab === 'today' ? !isTaskDone(task.status) : isTaskDone(task.status)
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Row */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('worker.myTasks')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/create-task')}
          style={styles.addTaskBtn}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <View style={styles.tabs}>
          {(['today', 'completed'] as TabKey[]).map((tab) => {
            const isSel = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isSel && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isSel && styles.activeTabText]}>
                  {tab === 'today' ? 'Pending Tasks' : 'Completed'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Task list */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 160, paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => {
          const taskCompleted = isTaskDone(item.status);
          const priorityColor = PRIORITY_COLORS[item.priority || 'medium'] || colors.warning;
          const isSubtask = !!item.parent_id;
          const formattedDate = item.window_end
            ? new Date(item.window_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            : 'Today, 5:00 PM';
          const hasSpecificZone = item.level_zone && item.level_zone !== 'General Zone';

          return (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.neutral[200],
                marginBottom: spacing.sm,
                marginLeft: isSubtask ? 20 : 0,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row' }}>
                {/* Priority accent border */}
                <View style={{ width: 4, backgroundColor: priorityColor }} />

                <View style={{ flex: 1, padding: spacing.md }}>
                  {isSubtask && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Ionicons name="git-branch-outline" size={12} color={colors.primary} />
                      <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: colors.primary }}>
                        SUBTASK
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <TouchableOpacity
                      style={{ marginTop: 2 }}
                      onPress={() =>
                        updateStatus.mutate({
                          taskId: item.id,
                          status: taskCompleted ? 'pending' : 'done',
                        })
                      }
                    >
                      {taskCompleted ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                      ) : (
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: priorityColor }} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          { fontSize: 14, fontFamily: fontFamily.semiBold, color: colors.ink, marginBottom: 4 },
                          taskCompleted && { textDecorationLine: 'line-through', color: colors.neutral[400] },
                        ]}
                      >
                        {item.title}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        {hasSpecificZone && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="location-outline" size={12} color={colors.neutral[400]} />
                            <Text style={{ fontSize: 11, color: colors.neutral[500] }}>{item.level_zone}</Text>
                          </View>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="time-outline" size={12} color={colors.neutral[400]} />
                          <Text style={{ fontSize: 11, color: colors.neutral[600], fontFamily: fontFamily.medium }}>
                            Due: {formattedDate}
                          </Text>
                        </View>

                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, backgroundColor: priorityColor + '18' }}>
                          <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: priorityColor, textTransform: 'uppercase' }}>
                            {item.priority || 'Normal'}
                          </Text>
                        </View>

                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, backgroundColor: '#F3E8C4' }}>
                          <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: '#695030' }}>
                            Manager Assigned ⭐
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Checklist Section */}
                  {Array.isArray(item.checklist) && item.checklist.length > 0 && (
                    <View style={styles.checklistContainer}>
                      {item.checklist.map((checkItem: any, index: number) => {
                        const isObj = typeof checkItem === 'object' && checkItem !== null;
                        const itemText = isObj ? (checkItem.text || checkItem.title || String(checkItem)) : String(checkItem);
                        const itemDone = isObj ? !!checkItem.done : false;

                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.checklistItem}
                            onPress={() => {
                              const newChecklist = item.checklist!.map((c: any, i: number) => {
                                if (i !== index) return c;
                                if (typeof c === 'object' && c !== null) {
                                  return { ...c, done: !c.done };
                                }
                                return { text: String(c), done: true };
                              });
                              updateChecklist.mutate({ taskId: item.id, checklist: newChecklist });
                            }}
                          >
                            <Ionicons
                              name={itemDone ? 'checkmark-circle' : 'square-outline'}
                              size={16}
                              color={itemDone ? colors.success : colors.neutral[400]}
                            />
                            <Text style={[styles.checklistText, itemDone && styles.checklistTextDone]}>
                              {itemText}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>{isLoading ? 'Loading tasks…' : 'No tasks in this view.'}</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.ink,
  },
  addTaskBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  activeTab: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.neutral[500],
  },
  activeTabText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['5xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.neutral[400],
  },
  checklistContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 4,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  checklistText: {
    fontSize: 12,
    color: colors.ink,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: colors.neutral[400],
  },
});
