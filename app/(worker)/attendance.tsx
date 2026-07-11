import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useAttendanceHistory } from '../../src/hooks/useAttendance';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

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
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const profile = useAuthStore((s) => s.profile);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Real attendance records for this worker (last ~13 months covers year nav)
  const { data: history } = useAttendanceHistory(profile?.id, 400);
  const byDate = new Map((history || []).map((a) => [a.date, a]));

  function getStatus(day: number): DayStatus {
    const key = dateKey(year, month, day);
    const record = byDate.get(key);
    if (record) return record.status;
    const cellDate = new Date(year, month, day);
    if (cellDate > today) return 'future';
    return 'none'; // no record for a past day = not marked yet
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>{t('worker.attendance')}</Text>

      {/* Month navigation */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={colors.ink} />
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

            return (
              <TouchableOpacity key={day} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayCircle,
                    isToday && styles.todayCircle,
                    status !== 'future' && status !== 'none' && {
                      backgroundColor: STATUS_COLORS[status] + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.todayText,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  monthText: {
    ...typography.h5,
    color: colors.ink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
