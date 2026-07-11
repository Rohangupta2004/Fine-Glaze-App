import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

type TabKey = 'today' | 'completed';

// Demo tasks — will come from Supabase + TanStack Query
const DEMO_TASKS = [
  { id: '1', title: 'Glass Panel Installation', zone: 'Level 4 – Zone B', priority: 'high' as const, status: 'pending' },
  { id: '2', title: 'Frame Alignment Check', zone: 'Level 4 – Zone A', priority: 'medium' as const, status: 'pending' },
  { id: '3', title: 'Site Cleanup', zone: 'Level 3', priority: 'low' as const, status: 'pending' },
  { id: '4', title: 'Silicone Sealing', zone: 'Level 3 – Zone B', priority: 'high' as const, status: 'pending' },
];

const PRIORITY_COLORS = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('today');

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
        data={DEMO_TASKS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={styles.taskCard} variant="interactive">
            <View style={styles.taskRow}>
              <TouchableOpacity style={styles.checkbox}>
                <View style={[styles.checkboxInner, { borderColor: PRIORITY_COLORS[item.priority] }]} />
              </TouchableOpacity>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <View style={styles.taskMeta}>
                  <Ionicons name="location-outline" size={12} color={colors.neutral[400]} />
                  <Text style={styles.taskZone}>{item.zone}</Text>
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
            <Text style={styles.emptyText}>No tasks</Text>
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
