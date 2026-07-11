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

import { Avatar, Card } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { useProjectAttendance } from '../../src/hooks/useAttendance';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../../src/theme/spacing';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(base: string, delta: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: colors.success, bg: colors.successBg },
  absent: { label: 'Absent', color: colors.error, bg: colors.errorBg },
  leave: { label: 'On Leave', color: colors.warning, bg: colors.warningBg },
  half_day: { label: 'Half Day', color: colors.info, bg: colors.infoBg },
  not_marked: { label: 'Not Marked', color: colors.neutral[400], bg: colors.neutral[100] },
};

export default function TeamAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const { data: projects } = useProjects();
  const activeProject = (projects || [])[0];

  const { data: teamRows = [], refetch, isRefetching } = useProjectAttendance(
    activeProject?.id,
    selectedDate,
  );

  const presentCount = teamRows.filter((r) => r.attendance?.status === 'present').length;
  const absentCount = teamRows.filter((r) => !r.attendance || r.attendance.status === 'absent').length;
  const leaveCount = teamRows.filter((r) => r.attendance?.status === 'leave' || r.attendance?.status === 'half_day').length;

  const isToday = selectedDate === todayISO();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Team Attendance</Text>
          {activeProject && (
            <Text style={styles.projectName}>{activeProject.name}</Text>
          )}
        </View>
        <View style={{ width: TOUCH_TARGET }} />
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity
          onPress={() => setSelectedDate(shiftDate(selectedDate, -1))}
          style={styles.dateArrow}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => !isToday && setSelectedDate(todayISO())}
          activeOpacity={isToday ? 1 : 0.7}
        >
          <Text style={styles.dateLabel}>{fmtDate(selectedDate)}{isToday ? ' (Today)' : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedDate(shiftDate(selectedDate, 1))}
          style={styles.dateArrow}
          disabled={isToday}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={22} color={isToday ? colors.neutral[300] : colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.successBg }]}>
          <Text style={[styles.summaryNum, { color: colors.success }]}>{presentCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.success }]}>Present</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.warningBg }]}>
          <Text style={[styles.summaryNum, { color: colors.warning }]}>{leaveCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.warning }]}>Leave</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.errorBg }]}>
          <Text style={[styles.summaryNum, { color: colors.error }]}>{absentCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.error }]}>Absent</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.neutral[100] }]}>
          <Text style={[styles.summaryNum, { color: colors.neutral[600] }]}>{teamRows.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.neutral[500] }]}>Total</Text>
        </View>
      </View>

      {/* Worker list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {teamRows.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No workers assigned to this project</Text>
          </View>
        )}
        {teamRows.map(({ profile, attendance }) => {
          const statusKey = attendance?.status || 'not_marked';
          const meta = STATUS_META[statusKey] || STATUS_META.not_marked;
          return (
            <Card key={profile.id} style={styles.workerCard} padding={spacing.md}>
              <View style={styles.workerRow}>
                <Avatar name={profile.full_name} uri={profile.avatar_url} size={44} />
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{profile.full_name}</Text>
                  <Text style={styles.workerId}>{profile.worker_id || profile.role}</Text>
                  {attendance?.check_in_at && (
                    <Text style={styles.checkTime}>
                      In: {new Date(attendance.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {attendance.check_out_at
                        ? `  Out: ${new Date(attendance.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { ...typography.h5, color: colors.ink },
  projectName: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  dateArrow: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: colors.ink },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryNum: { ...typography.h5 },
  summaryLabel: { ...typography.caption, marginTop: 2 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  workerCard: { marginBottom: spacing.sm },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workerInfo: { flex: 1 },
  workerName: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  workerId: { ...typography.caption, color: colors.neutral[500] },
  checkTime: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
