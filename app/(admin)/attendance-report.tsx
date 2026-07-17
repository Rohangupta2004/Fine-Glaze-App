import React, { useState } from 'react';
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

import { Avatar } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

type ViewMode = 'by_site' | 'by_team';

interface SiteAttendance {
  projectId: string;
  projectName: string;
  city: string;
  present: number;
  total: number;
  rate: number;
}

function useAttendanceReport(date: string) {
  return useQuery({
    queryKey: ['attendance-report', date],
    queryFn: async () => {
      const [attendance, projects, profiles] = await Promise.all([
        supabase.from('attendance').select('*').eq('date', date).then(r => r.data || []),
        supabase.from('projects').select('id,name,city').then(r => r.data || []),
        supabase.from('profiles').select('id,full_name,role,status')
          .in('role', ['worker', 'supervisor'])
          .eq('status', 'active')
          .then(r => r.data || []),
      ]);

      const present = attendance.filter((a: any) => a.status === 'present').length;
      const absent = attendance.filter((a: any) => a.status === 'absent').length;
      const halfDay = attendance.filter((a: any) => a.status === 'half_day').length;
      const onLeave = attendance.filter((a: any) => a.status === 'leave').length;

      const projMap = new Map((projects as any[]).map(p => [p.id, p]));
      const siteMap: Record<string, { present: number; total: number }> = {};
      attendance.forEach((a: any) => {
        if (!siteMap[a.project_id]) siteMap[a.project_id] = { present: 0, total: 0 };
        siteMap[a.project_id].total++;
        if (a.status === 'present' || a.status === 'half_day') siteMap[a.project_id].present++;
      });

      const bySite: SiteAttendance[] = Object.entries(siteMap).map(([pid, data]) => {
        const proj = projMap.get(pid);
        return {
          projectId: pid,
          projectName: proj?.name || 'Unknown',
          city: proj?.city || '',
          present: data.present,
          total: data.total,
          rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        };
      });

      return {
        date,
        totalWorkers: profiles.length,
        present,
        absent,
        halfDay,
        onLeave,
        bySite,
        attendance: attendance as any[],
        profiles: profiles as any[],
      };
    },
  });
}

export default function AttendanceReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>('by_site');

  const { data: report, refetch, isRefetching } = useAttendanceReport(selectedDate);

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

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
            <Text style={styles.headerTitle}>Attendance</Text>
          </View>
        </View>

        {/* Date Navigator in Header */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.dateNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#695030" />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Ionicons name="calendar" size={16} color="#695030" style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigateDate(1)} style={styles.dateNavBtn} disabled={selectedDate >= today}>
            <Ionicons name="chevron-forward" size={20} color={selectedDate >= today ? 'rgba(105,80,48,0.3)' : '#695030'} />
          </TouchableOpacity>
        </View>

        {/* Status Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{report?.present ?? 0}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{report?.halfDay ?? 0}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{report?.onLeave ?? 0}</Text>
            <Text style={styles.statLabel}>Leave</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>{report?.absent ?? 0}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      </View>

      {/* View mode tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabBtn, viewMode === 'by_site' && styles.tabBtnActive]} onPress={() => setViewMode('by_site')}>
            <Text style={[styles.tabBtnText, viewMode === 'by_site' && styles.tabBtnTextActive]}>By Site</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, viewMode === 'by_team' && styles.tabBtnActive]} onPress={() => setViewMode('by_team')}>
            <Text style={[styles.tabBtnText, viewMode === 'by_team' && styles.tabBtnTextActive]}>By Team</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#14B8A6" />}
      >
        {viewMode === 'by_site' && (report?.bySite || []).map((site) => (
          <View key={site.projectId} style={styles.card}>
            <View style={styles.siteRow}>
              <View style={styles.siteIconWrap}>
                <Ionicons name="business" size={20} color="#0F766E" />
              </View>
              <View style={styles.siteInfo}>
                <Text style={styles.siteName}>{site.projectName}</Text>
                <Text style={styles.siteCity}>{site.city}</Text>
              </View>
              <View style={styles.siteStats}>
                <Text style={styles.sitePresent}>{site.present} / {site.total}</Text>
                <Text style={styles.siteRate}>{site.rate}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${site.rate}%` }]} />
            </View>
          </View>
        ))}

        {viewMode === 'by_site' && (report?.bySite || []).length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="calendar" size={40} color="#14B8A6" />
            </View>
            <Text style={styles.emptyTitle}>No Records</Text>
            <Text style={styles.emptyText}>No attendance records for this date.</Text>
          </View>
        )}

        {viewMode === 'by_team' && (report?.profiles || []).map((prof: any) => {
          const att = (report?.attendance || []).find((a: any) => a.profile_id === prof.id);
          const isPresent = att?.status === 'present';
          const isHalf = att?.status === 'half_day';
          const isLeave = att?.status === 'leave';
          const isAbsent = att?.status === 'absent';

          const bgColor = isPresent ? '#D1FAE5' : isHalf ? '#FEF3C7' : isLeave ? '#EDE9FE' : isAbsent ? '#FEE2E2' : '#F3F4F6';
          const fgColor = isPresent ? '#059669' : isHalf ? '#D97706' : isLeave ? '#6D28D9' : isAbsent ? '#DC2626' : '#6B7280';
          const label = isPresent ? 'Present' : isHalf ? 'Half Day' : isLeave ? 'On Leave' : isAbsent ? 'Absent' : 'No Record';

          return (
            <View key={prof.id} style={styles.card}>
              <View style={styles.teamRow}>
                <Avatar name={prof.full_name} size={44} />
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{prof.full_name}</Text>
                  <Text style={styles.teamRole}>{prof.role}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: bgColor }]}>
                  <Text style={[styles.statusPillText, { color: fgColor }]}>{label}</Text>
                </View>
              </View>
              {att?.check_in_at && (
                <View style={styles.checkTimeRow}>
                  <Ionicons name="time-outline" size={14} color={colors.neutral[500]} />
                  <Text style={styles.checkTime}>
                    In: {new Date(att.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {att.check_out_at && ` · Out: ${new Date(att.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
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
  
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 4, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  dateNavBtn: { padding: spacing.sm },
  dateCenter: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },

  statsStrip: { flexDirection: 'row', gap: spacing.sm },
  statChip: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  statNum: { fontSize: 16, fontFamily: fontFamily.bold },
  statLabel: { fontSize: 10, color: colors.neutral[500], fontFamily: fontFamily.medium, textTransform: 'uppercase', marginTop: 2 },

  // Tabs
  tabContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(15,118,110,0.06)', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#fff', boxShadow: '0px 2px 4px rgba(0,0,0,0.04)' } as any,
  tabBtnText: { fontSize: 13, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  tabBtnTextActive: { color: '#0F766E', fontFamily: fontFamily.semiBold },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md, paddingTop: spacing.md },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)'
  } as any,
  
  siteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  siteIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  siteInfo: { flex: 1, marginLeft: spacing.md },
  siteName: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  siteCity: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  siteStats: { alignItems: 'flex-end' },
  sitePresent: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },
  siteRate: { fontSize: 12, fontFamily: fontFamily.semiBold, color: '#10B981', marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  teamRole: { fontSize: 12, color: colors.neutral[500], textTransform: 'capitalize', marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontFamily: fontFamily.bold },
  checkTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginLeft: 60 },
  checkTime: { fontSize: 12, fontFamily: fontFamily.medium, color: colors.neutral[600] },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(105,80,48,0.05)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 13, color: colors.neutral[400], textAlign: 'center' },
});
