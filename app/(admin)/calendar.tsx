/**
 * Admin Calendar — PRD §24a
 * Month view combining tasks, site visits, material deliveries, and DPR events per day.
 * Tap a day → see its tasks/events.
 * Matches reference image: screenshot_8 panel 12.
 */
import React, { useState, useMemo } from 'react';
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

import { Card } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface CalendarEvent {
  id: string;
  type: 'task' | 'dpr' | 'delivery' | 'leave' | 'attendance';
  title: string;
  time?: string;
  color: string;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad start to Monday
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;
  for (let i = startPad; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }

  // Days of month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad end to fill week
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }

  return days;
}

function useMonthEvents(year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

  return useQuery({
    queryKey: ['calendar-events', year, month],
    queryFn: async () => {
      const [tasks, dprs, deliveries, leaves, attendance] = await Promise.all([
        supabase.from('tasks').select('id,title,window_start,window_end,status,priority')
          .gte('window_start', startDate).lte('window_start', endDate + 'T23:59:59')
          .then(r => r.data || []),
        supabase.from('dprs').select('id,date,work_type,status')
          .gte('date', startDate).lte('date', endDate)
          .then(r => r.data || []),
        supabase.from('deliveries').select('id,delivery_code,status,created_at')
          .gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59')
          .then(r => r.data || []),
        supabase.from('leave_requests').select('id,from_date,to_date,type,status')
          .gte('from_date', startDate).lte('from_date', endDate)
          .eq('status', 'approved')
          .then(r => r.data || []),
        supabase.from('attendance').select('id,date,check_in_at,profiles(full_name),projects(name)')
          .gte('date', startDate).lte('date', endDate)
          .then(r => r.data || []),
      ]);

      // Build date → events map
      const eventsMap: Record<string, CalendarEvent[]> = {};

      const addEvent = (date: string, evt: CalendarEvent) => {
        if (!eventsMap[date]) eventsMap[date] = [];
        eventsMap[date].push(evt);
      };

      tasks.forEach((t: any) => {
        const d = t.window_start?.slice(0, 10);
        if (d) addEvent(d, {
          id: t.id,
          type: 'task',
          title: t.title,
          time: t.window_start?.slice(11, 16),
          color: t.priority === 'high' ? colors.error : t.priority === 'medium' ? colors.warning : colors.info,
        });
      });

      dprs.forEach((d: any) => {
        addEvent(d.date, {
          id: d.id,
          type: 'dpr',
          title: `DPR: ${d.work_type || 'Report'}`,
          color: d.status === 'approved' ? colors.success : d.status === 'rejected' ? colors.error : colors.warning,
        });
      });

      deliveries.forEach((d: any) => {
        const date = d.created_at?.slice(0, 10);
        if (date) addEvent(date, {
          id: d.id,
          type: 'delivery',
          title: `Delivery ${d.delivery_code || ''}`,
          color: d.status === 'delivered' ? colors.success : colors.info,
        });
      });

      leaves.forEach((l: any) => {
        addEvent(l.from_date, {
          id: l.id,
          type: 'leave',
          title: `${l.type} Leave`,
          color: colors.pending,
        });
      });

      attendance.forEach((row: any) => {
        const worker = row.profiles?.full_name || 'Worker';
        const site = row.projects?.name || 'Unknown project';
        addEvent(row.date, { id: `attendance-${row.id}`, type: 'attendance', title: `${worker} → ${site}`, time: row.check_in_at?.slice(11, 16), color: colors.primary });
      });

      return eventsMap;
    },
  });
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10));

  const { data: eventsMap } = useMonthEvents(currentYear, currentMonth);
  const days = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const todayStr = today.toISOString().slice(0, 10);
  const selectedEvents = eventsMap?.[selectedDate] || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity onPress={() => {
          setCurrentMonth(today.getMonth());
          setCurrentYear(today.getFullYear());
          setSelectedDate(todayStr);
        }}>
          <Text style={styles.todayBtn}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {days.map((day, idx) => {
          const dateStr = day.toISOString().slice(0, 10);
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayEvents = eventsMap?.[dateStr] || [];
          const hasEvents = dayEvents.length > 0;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text
                style={[
                  styles.dayText,
                  !isCurrentMonth && styles.dayTextFaded,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                ]}
              >
                {day.getDate()}
              </Text>
              {hasEvents && (
                <View style={styles.eventDots}>
                  {dayEvents.slice(0, 3).map((evt, i) => (
                    <View key={i} style={[styles.eventDot, { backgroundColor: evt.color }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected date events */}
      <View style={styles.eventsHeader}>
        <Text style={styles.eventsTitle}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        <Text style={styles.eventCount}>{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['6xl'] }}
      >
        {selectedEvents.length === 0 && (
          <View style={styles.emptyEvents}>
            <Ionicons name="calendar-outline" size={32} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No events on this day</Text>
          </View>
        )}

        {selectedEvents.map((evt) => (
          <Card key={evt.id} style={styles.eventCard} variant="interactive">
            <View style={styles.eventRow}>
              <View style={[styles.eventStripe, { backgroundColor: evt.color }]} />
              <View style={styles.eventInfo}>
                <View style={styles.eventTypeRow}>
                  <Ionicons
                    name={
                      evt.type === 'task' ? 'checkmark-circle' :
                      evt.type === 'dpr' ? 'document-text' :
                      evt.type === 'delivery' ? 'cube' : evt.type === 'attendance' ? 'people' : 'calendar'
                    }
                    size={14}
                    color={evt.color}
                  />
                  <Text style={[styles.eventType, { color: evt.color }]}>
                    {evt.type.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.eventTitle}>{evt.title}</Text>
                {evt.time && <Text style={styles.eventTime}>{evt.time}</Text>}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { ...typography.h4, color: colors.ink },
  todayBtn: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.primary },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  monthTitle: { ...typography.h5, color: colors.ink },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekDay: { flex: 1, textAlign: 'center', ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[500] },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dayCellSelected: { backgroundColor: colors.primary },
  dayCellToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  dayTextFaded: { color: colors.neutral[300] },
  dayTextSelected: { color: colors.white },
  dayTextToday: { color: colors.primary },
  eventDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  eventsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  eventsTitle: { ...typography.h6, color: colors.ink },
  eventCount: { ...typography.caption, color: colors.neutral[500] },
  emptyEvents: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400] },
  eventCard: { padding: spacing.md, marginBottom: spacing.sm },
  eventRow: { flexDirection: 'row', gap: spacing.md },
  eventStripe: { width: 3, borderRadius: 2 },
  eventInfo: { flex: 1 },
  eventTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  eventType: { ...typography.caption, fontFamily: fontFamily.semiBold },
  eventTitle: { ...typography.h6, color: colors.ink },
  eventTime: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
});
