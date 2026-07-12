/**
 * All-Sites Overview — Admin
 * PRD §27 — Every project: % complete, headcount today, open issues, pending ₹
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Card, StatusChip } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

interface SiteOverview {
  id: string;
  name: string;
  city: string;
  status: string;
  progress_pct: number;
  headcount: number;
  pendingTasks: number;
  pendingPayments: number;
}

function useAllSites() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['all-sites-overview'],
    queryFn: async (): Promise<SiteOverview[]> => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      if (error) throw error;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map((p: any) => p.id);

      const [attendance, tasks, payments] = await Promise.all([
        supabase.from('attendance').select('project_id')
          .eq('date', today).in('project_id', projectIds)
          .in('status', ['present', 'half_day'])
          .then(r => r.data || []),
        supabase.from('tasks').select('project_id,status')
          .in('project_id', projectIds).eq('status', 'pending')
          .then(r => r.data || []),
        supabase.from('payments').select('project_id,amount,status')
          .in('project_id', projectIds).eq('status', 'pending')
          .then(r => r.data || []),
      ]);

      // Aggregate
      const headcountMap: Record<string, number> = {};
      attendance.forEach((a: any) => {
        headcountMap[a.project_id] = (headcountMap[a.project_id] || 0) + 1;
      });

      const taskMap: Record<string, number> = {};
      tasks.forEach((t: any) => {
        taskMap[t.project_id] = (taskMap[t.project_id] || 0) + 1;
      });

      const paymentMap: Record<string, number> = {};
      payments.forEach((p: any) => {
        paymentMap[p.project_id] = (paymentMap[p.project_id] || 0) + Number(p.amount);
      });

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        city: p.city || '',
        status: p.status,
        progress_pct: p.progress_pct,
        headcount: headcountMap[p.id] || 0,
        pendingTasks: taskMap[p.id] || 0,
        pendingPayments: paymentMap[p.id] || 0,
      }));
    },
  });
}

function fmtINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function AllSitesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sites, refetch, isRefetching } = useAllSites();

  // Summary
  const totalSites = sites?.length || 0;
  const totalHeadcount = sites?.reduce((s, site) => s + site.headcount, 0) || 0;
  const totalPendingTasks = sites?.reduce((s, site) => s + site.pendingTasks, 0) || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>All Sites</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Ionicons name="business" size={20} color={colors.primary} />
          <Text style={[styles.summaryNum, { color: colors.primary }]}>{totalSites}</Text>
          <Text style={styles.summaryLabel}>Sites</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Ionicons name="people" size={20} color={colors.success} />
          <Text style={[styles.summaryNum, { color: colors.success }]}>{totalHeadcount}</Text>
          <Text style={styles.summaryLabel}>On Site Today</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Ionicons name="alert-circle" size={20} color={colors.warning} />
          <Text style={[styles.summaryNum, { color: colors.warning }]}>{totalPendingTasks}</Text>
          <Text style={styles.summaryLabel}>Open Tasks</Text>
        </Card>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {(sites || []).map((site) => (
          <TouchableOpacity
            key={site.id}
            onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: site.id } })}
          >
            <Card style={styles.siteCard} variant="interactive">
              <View style={styles.siteHeader}>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteCity}>{site.city}</Text>
                </View>
                <StatusChip status={site.status as any} />
              </View>

              {/* Progress bar */}
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${site.progress_pct}%` }]} />
                </View>
                <Text style={styles.progressText}>{site.progress_pct}%</Text>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={14} color={colors.neutral[500]} />
                  <Text style={styles.statText}>{site.headcount} today</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.neutral[500]} />
                  <Text style={styles.statText}>{site.pendingTasks} tasks</Text>
                </View>
                {site.pendingPayments > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="cash" size={14} color={colors.warning} />
                    <Text style={[styles.statText, { color: colors.warning }]}>{fmtINR(site.pendingPayments)}</Text>
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {(!sites || sites.length === 0) && (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No projects yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { ...typography.h4, color: colors.ink },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  summaryCard: { flex: 1, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  summaryNum: { ...typography.h4, fontFamily: fontFamily.bold },
  summaryLabel: { ...typography.caption, color: colors.neutral[500], textAlign: 'center' },
  siteCard: { padding: spacing.lg, marginBottom: spacing.md },
  siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  siteInfo: { flex: 1, marginRight: spacing.sm },
  siteName: { ...typography.h6, color: colors.ink },
  siteCity: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.neutral[100], borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary, width: 36, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: spacing.lg },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { ...typography.caption, color: colors.neutral[500] },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
