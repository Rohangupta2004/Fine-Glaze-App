/**
 * Analytics — Admin
 * PRD §29b — Only 5 useful charts, no vanity graphs:
 * 1. Attendance trend (30 days)
 * 2. DPR completion rate
 * 3. Material requests (pending vs fulfilled)
 * 4. Project completion %
 * 5. Payment status (billed vs received)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Card, ScreenSkeleton, RetryBanner } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

interface AnalyticsData {
  attendanceTrend: { present: number; absent: number; total: number; rate: number };
  dprCompletion: { submitted: number; approved: number; rejected: number; rate: number };
  materials: { pending: number; approved: number; rejected: number; ordered: number };
  projectCompletion: { projects: Array<{ name: string; progress: number; status: string }> };
  payments: { totalBilled: number; totalReceived: number; pending: number; rate: number };
}

function useAnalytics() {
  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);

      const [attendance, dprs, materials, projects, payments] = await Promise.all([
        supabase.from('attendance').select('status').gte('date', dateStr).then(r => r.data || []),
        supabase.from('dprs').select('status').then(r => r.data || []),
        supabase.from('material_requests').select('status').then(r => r.data || []),
        supabase.from('projects').select('name,progress_pct,status').then(r => r.data || []),
        supabase.from('payments').select('amount,status').then(r => r.data || []),
      ]);

      const present = attendance.filter((a: any) => a.status === 'present' || a.status === 'half_day').length;
      const absent = attendance.filter((a: any) => a.status === 'absent').length;

      const dprApproved = dprs.filter((d: any) => d.status === 'approved').length;
      const dprSubmitted = dprs.filter((d: any) => d.status === 'submitted').length;
      const dprRejected = dprs.filter((d: any) => d.status === 'rejected').length;

      const matPending = materials.filter((m: any) => m.status === 'pending').length;
      const matApproved = materials.filter((m: any) => m.status === 'approved').length;
      const matRejected = materials.filter((m: any) => m.status === 'rejected').length;
      const matOrdered = materials.filter((m: any) => m.status === 'ordered').length;

      const totalBilled = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const totalReceived = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount), 0);

      return {
        attendanceTrend: {
          present,
          absent,
          total: attendance.length,
          rate: attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0,
        },
        dprCompletion: {
          submitted: dprSubmitted,
          approved: dprApproved,
          rejected: dprRejected,
          rate: dprs.length > 0 ? Math.round((dprApproved / dprs.length) * 100) : 0,
        },
        materials: {
          pending: matPending,
          approved: matApproved,
          rejected: matRejected,
          ordered: matOrdered,
        },
        projectCompletion: {
          projects: (projects as any[]).map(p => ({ name: p.name, progress: p.progress_pct, status: p.status })),
        },
        payments: {
          totalBilled,
          totalReceived,
          pending: totalBilled - totalReceived,
          rate: totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

function ProgressBar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  return (
    <View style={[pStyles.track, { height }]}>
      <View style={[pStyles.fill, { width: `${Math.min(value, 100)}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const pStyles = StyleSheet.create({
  track: { flex: 1, backgroundColor: colors.neutral[100], borderRadius: 4 },
  fill: { borderRadius: 4 },
});

function CircularProgress({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 6, borderColor: colors.neutral[100],
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 6, borderColor: color,
          borderRightColor: 'transparent',
          borderBottomColor: value > 50 ? color : 'transparent',
          borderLeftColor: value > 75 ? color : 'transparent',
          transform: [{ rotate: `${(value / 100) * 360 - 90}deg` }],
        }} />
        <Text style={{ ...typography.h5, color: colors.ink }}>{value}%</Text>
      </View>
    </View>
  );
}

function fmtINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useAnalytics();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && <ScreenSkeleton />}
      {isError && <RetryBanner onRetry={refetch} />}

      {/* 1. Attendance Trend (30 days) */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="people" size={20} color={colors.info} />
          <Text style={styles.chartTitle}>Attendance (30 days)</Text>
        </View>
        <View style={styles.chartContent}>
          <CircularProgress value={data?.attendanceTrend.rate ?? 0} color={colors.success} />
          <View style={styles.chartLegend}>
            <LegendItem color={colors.success} label="Present" value={data?.attendanceTrend.present ?? 0} />
            <LegendItem color={colors.error} label="Absent" value={data?.attendanceTrend.absent ?? 0} />
            <LegendItem color={colors.neutral[400]} label="Total Records" value={data?.attendanceTrend.total ?? 0} />
          </View>
        </View>
      </Card>

      {/* 2. DPR Completion Rate */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="document-text" size={20} color={colors.warning} />
          <Text style={styles.chartTitle}>DPR Completion</Text>
        </View>
        <View style={styles.chartContent}>
          <CircularProgress value={data?.dprCompletion.rate ?? 0} color={colors.success} />
          <View style={styles.chartLegend}>
            <LegendItem color={colors.success} label="Approved" value={data?.dprCompletion.approved ?? 0} />
            <LegendItem color={colors.warning} label="Pending" value={data?.dprCompletion.submitted ?? 0} />
            <LegendItem color={colors.error} label="Rejected" value={data?.dprCompletion.rejected ?? 0} />
          </View>
        </View>
      </Card>

      {/* 3. Material Requests */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="cube" size={20} color={colors.pending} />
          <Text style={styles.chartTitle}>Material Requests</Text>
        </View>
        <View style={styles.barGroup}>
          <BarItem label="Pending" value={data?.materials.pending ?? 0} color={colors.warning} total={
            (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
          } />
          <BarItem label="Approved" value={data?.materials.approved ?? 0} color={colors.success} total={
            (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
          } />
          <BarItem label="Ordered" value={data?.materials.ordered ?? 0} color={colors.info} total={
            (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
          } />
          <BarItem label="Rejected" value={data?.materials.rejected ?? 0} color={colors.error} total={
            (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
          } />
        </View>
      </Card>

      {/* 4. Project Completion */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="business" size={20} color={colors.primary} />
          <Text style={styles.chartTitle}>Project Completion</Text>
        </View>
        {(data?.projectCompletion.projects || []).map((proj, idx) => (
          <View key={idx} style={styles.projectBar}>
            <View style={styles.projectBarHeader}>
              <Text style={styles.projectBarName} numberOfLines={1}>{proj.name}</Text>
              <Text style={[styles.projectBarPct, { color: proj.progress >= 80 ? colors.success : proj.progress >= 50 ? colors.warning : colors.primary }]}>
                {proj.progress}%
              </Text>
            </View>
            <ProgressBar value={proj.progress} color={proj.progress >= 80 ? colors.success : proj.progress >= 50 ? colors.warning : colors.primary} />
          </View>
        ))}
        {(!data?.projectCompletion.projects || data.projectCompletion.projects.length === 0) && (
          <Text style={styles.noData}>No projects yet</Text>
        )}
      </Card>

      {/* 5. Payment Status */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="cash" size={20} color={colors.success} />
          <Text style={styles.chartTitle}>Payment Status</Text>
        </View>
        <View style={styles.paymentStats}>
          <View style={styles.paymentStat}>
            <Text style={styles.paymentAmount}>{fmtINR(data?.payments.totalBilled ?? 0)}</Text>
            <Text style={styles.paymentLabel}>Total Billed</Text>
          </View>
          <View style={styles.paymentStat}>
            <Text style={[styles.paymentAmount, { color: colors.success }]}>{fmtINR(data?.payments.totalReceived ?? 0)}</Text>
            <Text style={styles.paymentLabel}>Received</Text>
          </View>
          <View style={styles.paymentStat}>
            <Text style={[styles.paymentAmount, { color: colors.warning }]}>{fmtINR(data?.payments.pending ?? 0)}</Text>
            <Text style={styles.paymentLabel}>Pending</Text>
          </View>
        </View>
        <ProgressBar value={data?.payments.rate ?? 0} color={colors.success} height={10} />
        <Text style={styles.paymentRate}>{data?.payments.rate ?? 0}% collected</Text>
      </Card>
    </ScrollView>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function BarItem({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.barItem}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barValue, { color }]}>{value}</Text>
      </View>
      <ProgressBar value={pct} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { ...typography.h4, color: colors.ink },
  chartCard: { padding: spacing.xl, marginBottom: spacing.lg },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  chartTitle: { ...typography.h6, color: colors.ink },
  chartContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  chartLegend: { flex: 1, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...typography.bodySmall, color: colors.neutral[600], flex: 1 },
  legendValue: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink },
  barGroup: { gap: spacing.md },
  barItem: { gap: 4 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { ...typography.bodySmall, color: colors.neutral[600] },
  barValue: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  projectBar: { marginBottom: spacing.md },
  projectBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  projectBarName: { ...typography.bodySmall, color: colors.ink, flex: 1, marginRight: spacing.sm },
  projectBarPct: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  noData: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center', paddingVertical: spacing.xl },
  paymentStats: { flexDirection: 'row', marginBottom: spacing.lg },
  paymentStat: { flex: 1, alignItems: 'center' },
  paymentAmount: { ...typography.h5, color: colors.ink },
  paymentLabel: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  paymentRate: { ...typography.caption, color: colors.neutral[500], textAlign: 'center', marginTop: spacing.sm },
});
