import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/authStore';
import { useAttendanceHistory, usePunchOut } from '../../../src/hooks/useAttendance';
import { colors } from '../../../src/theme/colors';
import { typography, fontFamily } from '../../../src/theme/typography';
import { spacing, radius } from '../../../src/theme/spacing';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type DayStatus = 'present' | 'absent' | 'leave' | 'half_day' | 'none' | 'future';

const STATUS_COLORS: Record<DayStatus, string> = {
  present: colors.success,
  absent: colors.error,
  leave: colors.warning,
  half_day: colors.pending,
  none: colors.transparent,
  future: colors.transparent,
};

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const profile = useAuthStore((s) => s.profile);
  const punchOut = usePunchOut();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Real attendance records for this worker
  const { data: history } = useAttendanceHistory(profile?.id, 400);

  // Map with date key normalization (stripping T00:00:00.000Z timestamps if present)
  const byDate = new Map(
    (history || []).map((a) => {
      const rawDate = a.date ? a.date.split('T')[0] : '';
      return [rawDate, a];
    })
  );

  function getRecord(day: number) {
    const key = dateKey(year, month, day);
    return byDate.get(key) || null;
  }

  function getStatus(day: number): DayStatus {
    const record = getRecord(day);
    if (record) return record.status;
    const cellDate = new Date(year, month, day);
    if (cellDate > today) return 'future';
    return 'none';
  }

  // Build calendar grid
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  // Stats
  const monthStatuses = Array.from({ length: daysInMonth }, (_, i) => getStatus(i + 1));
  const presentDays = monthStatuses.filter((s) => s === 'present').length;
  const leaveDays = monthStatuses.filter((s) => s === 'leave').length;
  const halfDays = monthStatuses.filter((s) => s === 'half_day').length;

  const selectedRecord = selectedDay ? getRecord(selectedDay) : null;
  const selectedStatus = selectedDay ? getStatus(selectedDay) : 'none';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('worker.attendance')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month navigation */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.statsRow}>
          <Card style={{ ...styles.statCard, backgroundColor: colors.successBg }} variant="flat">
            <Text style={[styles.statNum, { color: colors.success }]}>{presentDays}</Text>
            <Text style={styles.statLabel}>{t('worker.present')}</Text>
          </Card>
          <Card style={{ ...styles.statCard, backgroundColor: colors.warningBg }} variant="flat">
            <Text style={[styles.statNum, { color: colors.warning }]}>{leaveDays}</Text>
            <Text style={styles.statLabel}>{t('worker.leave')}</Text>
          </Card>
          <Card style={{ ...styles.statCard, backgroundColor: colors.pendingBg }} variant="flat">
            <Text style={[styles.statNum, { color: colors.pending }]}>{halfDays}</Text>
            <Text style={styles.statLabel}>{t('worker.halfDay')}</Text>
          </Card>
        </View>

        {/* Calendar grid */}
        <Card style={styles.calendar}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {days.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }
              const status = getStatus(day);
              const isToday = isCurrentMonth && day === today.getDate();
              const isSelected = selectedDay === day;

              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dayCell}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && styles.todayCircle,
                      isSelected && styles.selectedCircle,
                      status !== 'future' && status !== 'none' && {
                        backgroundColor: STATUS_COLORS[status] + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.todayText,
                        isSelected && styles.selectedText,
                        status === 'future' && styles.futureText,
                      ]}
                    >
                      {day}
                    </Text>
                    {status !== 'future' && status !== 'none' && (
                      <View
                        style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Selected Day Shift Detail Telemetry */}
        {selectedDay !== null && (
          <Card style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.ink }}>
                Shift Details — {selectedDay} {currentMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: (STATUS_COLORS[selectedStatus] || colors.neutral[400]) + '20',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: fontFamily.bold,
                    color: STATUS_COLORS[selectedStatus] !== colors.transparent ? STATUS_COLORS[selectedStatus] : colors.neutral[600],
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedStatus === 'none' ? 'No Record' : selectedStatus}
                </Text>
              </View>
            </View>

            {selectedRecord ? (
              <View style={{ gap: 8, paddingTop: 4 }}>
                <View style={styles.infoLine}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={styles.infoLineText}>
                    Punch In: <Text style={{ fontFamily: fontFamily.semiBold, color: colors.ink }}>
                      {selectedRecord.check_in_at ? new Date(selectedRecord.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoLine}>
                  <Ionicons name="log-out-outline" size={16} color={colors.warning} />
                  <Text style={styles.infoLineText}>
                    Punch Out: <Text style={{ fontFamily: fontFamily.semiBold, color: colors.ink }}>
                      {selectedRecord.check_out_at ? new Date(selectedRecord.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                    </Text>
                  </Text>
                </View>
                {!selectedRecord.check_out_at && (
                  <TouchableOpacity
                    style={{
                      marginTop: spacing.xs,
                      backgroundColor: '#D97706',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: radius.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    disabled={punchOut.isPending}
                    onPress={() => punchOut.mutate({ attendanceId: selectedRecord.id, checkInAt: selectedRecord.check_in_at })}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#FFFFFF' }}>
                      {punchOut.isPending ? 'Punching Out...' : 'Punch Out Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                No punch-in recorded for this day.
              </Text>
            )}
          </Card>
        )}


        {/* Legend */}
        <View style={styles.legend}>
          {[
            { label: t('worker.present'), color: colors.success },
            { label: t('worker.absent'), color: colors.error },
            { label: t('worker.leave'), color: colors.warning },
            { label: t('worker.halfDay'), color: colors.pending },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.ink,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.neutral[100],
  },
  monthText: {
    ...typography.h5,
    color: colors.ink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  statNum: {
    ...typography.h4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  calendar: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedCircle: {
    backgroundColor: colors.primary,
  },
  selectedText: {
    color: colors.white,
    fontFamily: fontFamily.bold,
  },
  dayText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  todayText: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  futureText: {
    color: colors.neutral[300],
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLineText: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.neutral[600],
  },
});
