import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing, shadows } from '../theme/spacing';
import type { Task } from '../types';

interface MISAnalyticsChartsProps {
  tasks: Task[];
  overallProgressPct?: number;
}

export function MISAnalyticsCharts({ tasks, overallProgressPct }: MISAnalyticsChartsProps) {
  const mainTasks = tasks.filter((t) => !t.parent_id);
  const total = mainTasks.length;

  const completed = mainTasks.filter(
    (t) => t.status === 'done' || (t.planned_quantity && t.completed_quantity && t.completed_quantity >= t.planned_quantity)
  ).length;

  const inProgress = mainTasks.filter(
    (t) => t.status !== 'done' && (t.completed_quantity || 0) > 0
  ).length;

  const pending = Math.max(0, total - completed - inProgress);

  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const pendingPct = Math.max(0, 100 - completedPct - inProgressPct);

  const displayProgress = overallProgressPct !== undefined ? overallProgressPct : completedPct;

  // Category Breakdown Calculation
  const categories = ['Facade', 'Structure', 'Civil', 'General'];
  const categoryStats = categories.map((cat) => {
    const catTasks = mainTasks.filter((t) => (t.category || 'Facade') === cat);
    const catTotal = catTasks.length;
    if (catTotal === 0) return { category: cat, progress: 0 };

    const catDone = catTasks.filter(
      (t) => t.status === 'done' || (t.completed_quantity || 0) >= (t.planned_quantity || 1)
    ).length;

    return {
      category: cat,
      progress: Math.round((catDone / catTotal) * 100),
    };
  });

  return (
    <View style={styles.container}>
      {/* 1. Overall Progress Ring / Donut */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Overall Progress</Text>
        
        <View style={styles.donutRow}>
          <View style={styles.donutContainer}>
            <View style={styles.donutRing}>
              <Text style={styles.donutValue}>{displayProgress}%</Text>
              <Text style={styles.donutLabel}>Project Completion</Text>
            </View>
          </View>

          <View style={styles.legendColumn}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.legendText}>Completed</Text>
              <Text style={styles.legendVal}>{completedPct}%</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendText}>In Progress</Text>
              <Text style={styles.legendVal}>{inProgressPct}%</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Pending</Text>
              <Text style={styles.legendVal}>{pendingPct}%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Task Status Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Task Status</Text>
        
        <View style={styles.barChartContainer}>
          <View style={styles.barGroup}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#16A34A',
                    height: `${total > 0 ? Math.min(100, Math.max(10, (completed / total) * 100)) : 10}%`,
                  },
                ]}
              >
                <Text style={styles.barValText}>{completed}</Text>
              </View>
            </View>
            <Text style={styles.barLabel}>Completed</Text>
          </View>

          <View style={styles.barGroup}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#D97706',
                    height: `${total > 0 ? Math.min(100, Math.max(10, (inProgress / total) * 100)) : 10}%`,
                  },
                ]}
              >
                <Text style={styles.barValText}>{inProgress}</Text>
              </View>
            </View>
            <Text style={styles.barLabel}>In Progress</Text>
          </View>

          <View style={styles.barGroup}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#DC2626',
                    height: `${total > 0 ? Math.min(100, Math.max(10, (pending / total) * 100)) : 10}%`,
                  },
                ]}
              >
                <Text style={styles.barValText}>{pending}</Text>
              </View>
            </View>
            <Text style={styles.barLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* 3. Category Progress Bars */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Category Progress</Text>
        
        <View style={styles.catList}>
          {categoryStats.map((item) => (
            <View key={item.category} style={styles.catItem}>
              <View style={styles.catMeta}>
                <Text style={styles.catName}>{item.category}</Text>
                <Text style={styles.catPct}>{item.progress}%</Text>
              </View>

              <View style={styles.catTrack}>
                <View
                  style={[
                    styles.catFill,
                    {
                      width: `${Math.max(2, item.progress)}%`,
                      backgroundColor:
                        item.category === 'Facade'
                          ? '#2563EB'
                          : item.category === 'Structure'
                          ? '#059669'
                          : item.category === 'Civil'
                          ? '#D97706'
                          : '#8B5CF6',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  chartCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },

  // Donut Ring
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  donutContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  donutRing: { alignItems: 'center' },
  donutValue: { fontSize: 20, fontWeight: '800', color: colors.neutral[900] },
  donutLabel: { fontSize: 9, color: colors.neutral[500], textAlign: 'center' },

  legendColumn: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.neutral[600], width: 70 },
  legendVal: { fontSize: 12, fontWeight: '700', color: colors.neutral[900] },

  // Bar Chart
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: spacing.xs,
  },
  barGroup: { alignItems: 'center', flex: 1 },
  barTrack: {
    width: 28,
    height: 85,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  barValText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  barLabel: { fontSize: 10, color: colors.neutral[600], marginTop: 4 },

  // Category Bars
  catList: { gap: 12 },
  catItem: {},
  catMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 12, fontWeight: '600', color: colors.neutral[700] },
  catPct: { fontSize: 12, fontWeight: '700', color: colors.neutral[900] },
  catTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 4 },

  // Pivot Table
  pivotTable: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.sm, overflow: 'hidden' },
  pivotThRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#E5E7EB', padding: 8 },
  pivotTh: { fontSize: 11, fontWeight: '700', color: colors.neutral[700] },
  pivotTr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F3F4F6', padding: 8 },
  pivotTd: { fontSize: 11, color: colors.neutral[800] },
});
