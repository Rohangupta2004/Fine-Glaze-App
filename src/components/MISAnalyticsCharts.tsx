import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

    let totalPlanned = 0;
    let totalCompleted = 0;
    catTasks.forEach((t) => {
      totalPlanned += t.planned_quantity || 1;
      totalCompleted += Math.min(t.planned_quantity || 1, t.completed_quantity || (t.status === 'done' ? (t.planned_quantity || 1) : 0));
    });

    const progress = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    return {
      category: cat,
      progress,
    };
  });

  return (
    <View style={styles.container}>
      {/* 1. Overall Progress Ring */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Overall Progress</Text>
        
        <View style={styles.donutRow}>
          <View style={[styles.donutContainer, { borderColor: displayProgress > 0 ? '#16A34A' : '#CBD5E1' }]}>
            <View style={styles.donutRing}>
              <Text style={styles.donutValue}>{displayProgress}%</Text>
              <Text style={styles.donutLabel}>Completion</Text>
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
          {/* Completed Bar */}
          <View style={styles.barGroup}>
            <Text style={[styles.barBadgeText, { color: '#16A34A' }]}>{completed}</Text>
            <View style={styles.barTrack}>
              <LinearGradient
                colors={['#4ADE80', '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.barFill,
                  {
                    height: completed > 0 ? `${Math.min(100, Math.max(10, completedPct))}%` : '0%',
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>Completed</Text>
          </View>

          {/* In Progress Bar */}
          <View style={styles.barGroup}>
            <Text style={[styles.barBadgeText, { color: '#D97706' }]}>{inProgress}</Text>
            <View style={styles.barTrack}>
              <LinearGradient
                colors={['#FBBF24', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.barFill,
                  {
                    height: inProgress > 0 ? `${Math.min(100, Math.max(10, inProgressPct))}%` : '0%',
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>In Progress</Text>
          </View>

          {/* Pending Bar */}
          <View style={styles.barGroup}>
            <Text style={[styles.barBadgeText, { color: '#DC2626' }]}>{pending}</Text>
            <View style={styles.barTrack}>
              <LinearGradient
                colors={['#FCA5A5', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.barFill,
                  {
                    height: pending > 0 ? `${Math.min(100, Math.max(10, pendingPct))}%` : '0%',
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* 3. Category Progress Bars */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Category Progress</Text>
        
        <View style={styles.catList}>
          {categoryStats.map((item) => {
            const gradColors: [string, string] =
              item.category === 'Facade'
                ? ['#60A5FA', '#2563EB']
                : item.category === 'Structure'
                ? ['#34D399', '#059669']
                : item.category === 'Civil'
                ? ['#FBBF24', '#D97706']
                : ['#C084FC', '#9333EA'];

            return (
              <View key={item.category} style={styles.catItem}>
                <View style={styles.catMeta}>
                  <Text style={styles.catName}>{item.category}</Text>
                  <Text style={styles.catPct}>{item.progress}%</Text>
                </View>

                <View style={styles.catTrack}>
                  {item.progress > 0 ? (
                    <LinearGradient
                      colors={gradColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.catFill,
                        {
                          width: `${Math.min(100, item.progress)}%`,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingVertical: spacing.xs,
  },

  donutContainer: {
    width: 105,
    height: 105,
    borderRadius: 53,
    borderWidth: 8,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  donutRing: { alignItems: 'center', justifyContent: 'center' },
  donutValue: { fontSize: 22, fontWeight: '800', color: colors.neutral[900] },
  donutLabel: { fontSize: 9, fontWeight: '600', color: colors.neutral[500], textAlign: 'center', marginTop: 1 },

  legendColumn: { gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.neutral[600], width: 75, fontWeight: '500' },
  legendVal: { fontSize: 13, fontWeight: '700', color: colors.neutral[900] },

  // Bar Chart
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: spacing.xs,
  },
  barGroup: { alignItems: 'center', flex: 1 },
  barBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  barTrack: {
    width: 32,
    height: 75,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: { fontSize: 11, fontWeight: '600', color: colors.neutral[600], marginTop: 6 },

  // Category Bars
  catList: { gap: 12 },
  catItem: {},
  catMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 12, fontWeight: '600', color: colors.neutral[700] },
  catPct: { fontSize: 12, fontWeight: '700', color: colors.neutral[900] },
  catTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 4 },
});


