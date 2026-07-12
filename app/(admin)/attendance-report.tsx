/**
 * Attendance Report — Admin
 * PRD §24 — Per employee / all sites, date range, totals.
 * Matches reference: screenshot_8 panel 6.
 */
import React, { useState, useMemo } from 'react';
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

import { Card, Avatar, StatusChip } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

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

      // Summary stats
      const present = attendance.filter((a: any) => a.status === 'present').length;
      const absent = attendance.filter((a: any) => a.status === 'absent').length;
      const halfDay = attendance.filter((a: any) => a.status === 'half_day').length;
      const onLeave = attendance.filter((a: any) => a.status === 'leave').length;

      // By site
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
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Date navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => navigateDate(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
        <TouchableOpacity onPress={() => navigateDate(1)} hitSlop={12} disabled={selectedDate >= today}>
          <Ionicons name="chevron-forward" size={22} color={selectedDate >= today ? colors.neutral[300] : colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Summary stats — matches reference panel 6 */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: colors.success }]}>
          <Text style={[styles.statNum, { color: colors.success }]}>{report?.present ?? 0}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </Card>
        <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: colors.error }]}>
          <Text style={[styles.statNum, { color: colors.error }]}>{report?.absent ?? 0}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </Card>
        <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: colors.warning }]}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{report?.halfDay ?? 0}</Text>
          <Text style={styles.statLabel}>Half Day</Text>
        </Card>
        <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: colors.pending }]}>
          <Text style={[styles.statNum, { color: colors.pending }]}>{report?.onLeave ?? 0}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </Card>
      </View>

      {/* View mode tabs */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeTab, viewMode === 'by_site' && styles.modeTabActive]}
          onPress={() => setViewMode('by_site')}
        >
          <Text style={[styles.modeText, viewMode === 'by_site' && styles.modeTextActive]}>By Site</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, viewMode === 'by_team' && styles.modeTabActive]}
          onPress={() => setViewMode('by_team')}
        >
          <Text style={[styles.modeText, viewMode === 'by_team' && styles.modeTextActive]}>By Team</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {viewMode === 'by_site' && (report?.bySite || []).map((site) => (
          <Card key={site.projectId} style={styles.siteCard} variant="interactive">
            <View style={styles.siteRow}>
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
          </Card>
        ))}

        {viewMode === 'by_site' && (report?.bySite || []).length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No attendance records for this date</Text>
          </View>
        )}

        {viewMode === 'by_team' && (report?.profiles || []).map((prof: any) => {
          const att = (report?.attendance || []).find((a: any) => a.profile_id === prof.id);
          return (
            <Card key={prof.id} style={styles.teamCard} variant="interactive">
              <View style={styles.teamRow}>
                <Avatar name={prof.full_name} size={40} />
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{prof.full_name}</Text>
                  <Text style={styles.teamRole}>{prof.role}</Text>
                </View>
                <View style={[
                  styles.statusPill,
                  {
                    backgroundColor: att
                      ? att.status === 'present' ? colors.successBg
                        : att.status === 'half_day' ? colors.warningBg
                        : att.status === 'leave' ? colors.pendingBg
                        : colors.errorBg
                      : colors.neutral[100],
                  },
                ]}>
                  <Text style={[
                    styles.statusPillText,
                    {
                      color: att
                        ? att.status === 'present' ? colors.success
                          : att.status === 'half_day' ? colors.warning
                          : att.status === 'leave' ? colors.pending
                          : colors.error
                        : colors.neutral[500],
                    },
                  ]}>
                    {att ? (att.status === 'present' ? 'Present' : att.status === 'half_day' ? 'Half Day' : att.status === 'leave' ? 'On Leave' : 'Absent') : 'No Record'}
                  </Text>
                </View>
              </View>
              {att?.check_in_at && (
                <Text style={styles.checkTime}>
                  In: {new Date(att.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {att.check_out_at && ` · Out: ${new Date(att.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                </Text>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { ...typography.h4, color: colors.ink },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  dateText: { ...typography.h6, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statNum: { ...typography.h3, fontFamily: fontFamily.bold },
  statLabel: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  modeRow: { flexDirection: 'row', backgroundColor: colors.neutral[100], borderRadius: radius.full, padding: 3, marginBottom: spacing.lg },
  modeTab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.full },
  modeTabActive: { backgroundColor: colors.white },
  modeText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  modeTextActive: { color: colors.ink },
  siteCard: { padding: spacing.lg, marginBottom: spacing.sm },
  siteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  siteInfo: { flex: 1 },
  siteName: { ...typography.h6, color: colors.ink },
  siteCity: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  siteStats: { alignItems: 'flex-end' },
  sitePresent: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink },
  siteRate: { ...typography.caption, color: colors.success },
  progressTrack: { height: 6, backgroundColor: colors.neutral[100], borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.success, borderRadius: 3 },
  teamCard: { padding: spacing.lg, marginBottom: spacing.sm },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamInfo: { flex: 1 },
  teamName: { ...typography.h6, color: colors.ink },
  teamRole: { ...typography.caption, color: colors.neutral[500], textTransform: 'capitalize' },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  statusPillText: { ...typography.caption, fontFamily: fontFamily.semiBold },
  checkTime: { ...typography.caption, color: colors.neutral[500], marginTop: spacing.sm, marginLeft: 52 },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
