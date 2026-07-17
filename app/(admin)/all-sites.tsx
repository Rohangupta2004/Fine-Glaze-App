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

import { StatusChip } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

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

      const headcountMap: Record<string, number> = {};
      attendance.forEach((a: any) => { headcountMap[a.project_id] = (headcountMap[a.project_id] || 0) + 1; });

      const taskMap: Record<string, number> = {};
      tasks.forEach((t: any) => { taskMap[t.project_id] = (taskMap[t.project_id] || 0) + 1; });

      const paymentMap: Record<string, number> = {};
      payments.forEach((p: any) => { paymentMap[p.project_id] = (paymentMap[p.project_id] || 0) + Number(p.amount); });

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

  const totalSites = sites?.length || 0;
  const totalHeadcount = sites?.reduce((s, site) => s + site.headcount, 0) || 0;
  const totalPendingTasks = sites?.reduce((s, site) => s + site.pendingTasks, 0) || 0;

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>Operations</Text>
            <Text style={styles.headerTitle}>All Sites</Text>
          </View>
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="business" size={16} color="#0F766E" />
            </View>
            <Text style={styles.summaryNum}>{totalSites}</Text>
            <Text style={styles.summaryLabel}>Sites</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="people" size={16} color="#10B981" />
            </View>
            <Text style={[styles.summaryNum, { color: '#10B981' }]}>{totalHeadcount}</Text>
            <Text style={styles.summaryLabel}>On Site Today</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <Ionicons name="alert-circle" size={16} color="#F59E0B" />
            </View>
            <Text style={[styles.summaryNum, { color: '#F59E0B' }]}>{totalPendingTasks}</Text>
            <Text style={styles.summaryLabel}>Open Tasks</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#14B8A6" />}
      >
        {(sites || []).map((site) => (
          <TouchableOpacity
            key={site.id}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: site.id } })}
          >
            <View style={styles.siteCard}>
              <View style={styles.siteHeader}>
                <View style={styles.siteIconWrap}>
                  <Ionicons name="business" size={20} color="#0F766E" />
                </View>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteCity}>{site.city}</Text>
                </View>
                <StatusChip status={site.status as any} />
              </View>

              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${site.progress_pct}%` }]} />
                </View>
                <Text style={styles.progressText}>{site.progress_pct}%</Text>
              </View>

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
                    <Ionicons name="cash" size={14} color="#F59E0B" />
                    <Text style={[styles.statText, { color: '#F59E0B' }]}>{fmtINR(site.pendingPayments)}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {(!sites || sites.length === 0) && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="business" size={40} color="#14B8A6" />
            </View>
            <Text style={styles.emptyTitle}>No Projects Yet</Text>
            <Text style={styles.emptyText}>You haven't created any projects.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: '#fff', padding: spacing.md, borderRadius: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)', boxShadow: '0px 4px 10px rgba(0,0,0,0.03)' } as any,
  summaryIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  summaryNum: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815' },
  summaryLabel: { fontSize: 10, color: colors.neutral[500], fontFamily: fontFamily.medium, textTransform: 'uppercase' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md, paddingTop: spacing.md },
  
  // Card
  siteCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)'
  } as any,
  siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  siteIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  siteInfo: { flex: 1, marginHorizontal: spacing.sm },
  siteName: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  siteCity: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0F766E', borderRadius: 4 },
  progressText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#0F766E', width: 36, textAlign: 'right' },
  
  statsRow: { flexDirection: 'row', gap: spacing.md, backgroundColor: '#FAF8F5', padding: spacing.sm, borderRadius: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  
  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(105,80,48,0.05)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 14, color: colors.neutral[400], textAlign: 'center' },
});
