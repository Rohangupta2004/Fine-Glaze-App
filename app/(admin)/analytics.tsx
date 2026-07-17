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

import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

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
  track: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden' },
  fill: { borderRadius: 10 },
});

function CircularProgress({ value, color, size = 96, icon }: { value: number; color: string; size?: number; icon?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 8, borderColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff',
      }}>
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 8, borderColor: color,
          borderRightColor: 'transparent',
          borderBottomColor: value > 50 ? color : 'transparent',
          borderLeftColor: value > 75 ? color : 'transparent',
          transform: [{ rotate: `${(value / 100) * 360 - 90}deg` }],
        }} />
        {icon ? (
          <Ionicons name={icon as any} size={24} color={color} style={{ marginBottom: -4 }} />
        ) : null}
        <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginTop: icon ? -2 : 0 }}>{value}%</Text>
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
  const { data } = useAnalytics();

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>Performance & Reports</Text>
            <Text style={styles.headerTitle}>Analytics</Text>
          </View>
        </View>
        
        {/* Overall Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusVal}>{data?.projectCompletion.projects.length || 0}</Text>
            <Text style={styles.statusLbl}>Active Projects</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusVal}>{data?.attendanceTrend.rate || 0}%</Text>
            <Text style={styles.statusLbl}>Attendance</Text>
          </View>
          <View style={[styles.statusItem, { borderRightWidth: 0 }]}>
            <Text style={styles.statusVal}>{data?.payments.rate || 0}%</Text>
            <Text style={styles.statusLbl}>Collection</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {/* 1. Attendance Trend (30 days) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={[styles.chartIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Ionicons name="people" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.chartTitle}>Attendance (30 Days)</Text>
          </View>
          <View style={styles.chartContent}>
            <CircularProgress value={data?.attendanceTrend.rate ?? 0} color="#10B981" icon="calendar" />
            <View style={styles.chartLegend}>
              <LegendItem color="#10B981" label="Present" value={data?.attendanceTrend.present ?? 0} />
              <LegendItem color="#EF4444" label="Absent" value={data?.attendanceTrend.absent ?? 0} />
              <LegendItem color="#9CA3AF" label="Total Records" value={data?.attendanceTrend.total ?? 0} />
            </View>
          </View>
        </View>

        {/* 2. DPR Completion Rate */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={[styles.chartIcon, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
              <Ionicons name="document-text" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.chartTitle}>DPR Completion Rate</Text>
          </View>
          <View style={styles.chartContent}>
            <CircularProgress value={data?.dprCompletion.rate ?? 0} color="#8B5CF6" icon="document-text" />
            <View style={styles.chartLegend}>
              <LegendItem color="#10B981" label="Approved" value={data?.dprCompletion.approved ?? 0} />
              <LegendItem color="#F59E0B" label="Pending" value={data?.dprCompletion.submitted ?? 0} />
              <LegendItem color="#EF4444" label="Rejected" value={data?.dprCompletion.rejected ?? 0} />
            </View>
          </View>
        </View>

        {/* 3. Material Requests */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={[styles.chartIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <Ionicons name="cube" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.chartTitle}>Material Requests</Text>
          </View>
          <View style={styles.barGroup}>
            <BarItem label="Pending" value={data?.materials.pending ?? 0} color="#F59E0B" total={
              (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
            } />
            <BarItem label="Approved" value={data?.materials.approved ?? 0} color="#10B981" total={
              (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
            } />
            <BarItem label="Ordered" value={data?.materials.ordered ?? 0} color="#3B82F6" total={
              (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
            } />
            <BarItem label="Rejected" value={data?.materials.rejected ?? 0} color="#EF4444" total={
              (data?.materials.pending ?? 0) + (data?.materials.approved ?? 0) + (data?.materials.rejected ?? 0) + (data?.materials.ordered ?? 0)
            } />
          </View>
        </View>

        {/* 4. Project Completion */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={[styles.chartIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="business" size={20} color="#10B981" />
            </View>
            <Text style={styles.chartTitle}>Project Completion</Text>
          </View>
          {(data?.projectCompletion.projects || []).map((proj, idx) => (
            <View key={idx} style={styles.projectBar}>
              <View style={styles.projectBarHeader}>
                <Text style={styles.projectBarName} numberOfLines={1}>{proj.name}</Text>
                <Text style={[styles.projectBarPct, { color: proj.progress >= 80 ? '#10B981' : proj.progress >= 50 ? '#F59E0B' : '#3B82F6' }]}>
                  {proj.progress}%
                </Text>
              </View>
              <ProgressBar value={proj.progress} color={proj.progress >= 80 ? '#10B981' : proj.progress >= 50 ? '#F59E0B' : '#3B82F6'} />
            </View>
          ))}
          {(!data?.projectCompletion.projects || data.projectCompletion.projects.length === 0) && (
            <Text style={styles.noData}>No active projects</Text>
          )}
        </View>

        {/* 5. Payment Status */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={[styles.chartIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="cash" size={20} color="#10B981" />
            </View>
            <Text style={styles.chartTitle}>Payment Collection</Text>
          </View>
          <View style={styles.paymentStats}>
            <View style={styles.paymentStat}>
              <Text style={styles.paymentAmount}>{fmtINR(data?.payments.totalBilled ?? 0)}</Text>
              <Text style={styles.paymentLabel}>Total Billed</Text>
            </View>
            <View style={styles.paymentStat}>
              <Text style={[styles.paymentAmount, { color: '#10B981' }]}>{fmtINR(data?.payments.totalReceived ?? 0)}</Text>
              <Text style={styles.paymentLabel}>Received</Text>
            </View>
            <View style={styles.paymentStat}>
              <Text style={[styles.paymentAmount, { color: '#F59E0B' }]}>{fmtINR(data?.payments.pending ?? 0)}</Text>
              <Text style={styles.paymentLabel}>Pending</Text>
            </View>
          </View>
          
          <View style={styles.paymentTrack}>
            <View style={[styles.paymentFill, { width: `${data?.payments.rate ?? 0}%` as any }]} />
          </View>
          <Text style={styles.paymentRate}>{data?.payments.rate ?? 0}% collected</Text>
        </View>
      </ScrollView>
    </View>
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
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  
  statusBar: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  statusItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(105,80,48,0.08)' },
  statusVal: { fontSize: 20, color: '#1E1815', fontFamily: fontFamily.bold },
  statusLbl: { fontSize: 10, color: '#666', fontFamily: fontFamily.medium, marginTop: 4, textTransform: 'uppercase' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md, paddingTop: spacing.md },
  
  // Card
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)'
  } as any,
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  chartIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chartTitle: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  chartContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  chartLegend: { flex: 1, gap: spacing.md },
  
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, color: colors.neutral[600], fontFamily: fontFamily.medium, flex: 1 },
  legendValue: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },
  
  barGroup: { gap: spacing.md },
  barItem: { gap: 6 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barLabel: { fontSize: 13, color: colors.neutral[600], fontFamily: fontFamily.medium },
  barValue: { fontSize: 14, fontFamily: fontFamily.bold },
  
  projectBar: { marginBottom: spacing.lg },
  projectBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  projectBarName: { fontSize: 13, fontFamily: fontFamily.semiBold, color: '#1E1815', flex: 1, marginRight: spacing.sm },
  projectBarPct: { fontSize: 13, fontFamily: fontFamily.bold },
  noData: { fontSize: 13, color: colors.neutral[400], textAlign: 'center', paddingVertical: spacing.xl, fontStyle: 'italic' },
  
  paymentStats: { flexDirection: 'row', marginBottom: spacing.xl },
  paymentStat: { flex: 1, alignItems: 'center' },
  paymentAmount: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  paymentLabel: { fontSize: 11, color: colors.neutral[500], fontFamily: fontFamily.medium, marginTop: 4, textTransform: 'uppercase' },
  
  paymentTrack: { height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden', marginBottom: spacing.sm },
  paymentFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 6 },
  paymentRate: { fontSize: 12, color: colors.neutral[500], fontFamily: fontFamily.semiBold, textAlign: 'center' },
});
