/**
 * Feature-Rich Admin & Personal Calendar — PRD §24a
 * Multi-category event scheduling (Meetings, Site Visits, Deadlines, Payments, Reminders, Tasks).
 * Full event lifecycle: create, filter by category, mark completed, delete, and view month analytics.
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '../../src/components';
import { DatePickerField } from '../../src/components/DatePickerField';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const COMPLETED_LOCAL_KEY = '@calendar_completed_events_v2';

export interface CalendarEventItem {
  id: string;
  type: 'meeting' | 'site_visit' | 'deadline' | 'payment' | 'task' | 'dpr' | 'delivery' | 'personal';
  title: string;
  date: string;
  time?: string;
  location?: string;
  priority?: 'p0' | 'p1' | 'p2';
  color: string;
  completed?: boolean;
}

const EVENT_CATEGORIES: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'meeting', label: 'Meeting', icon: 'call', color: '#2563EB' },
  { key: 'site_visit', label: 'Site Visit', icon: 'location', color: '#D97706' },
  { key: 'deadline', label: 'Deadline', icon: 'alert-circle', color: '#DC2626' },
  { key: 'payment', label: 'Payment', icon: 'cash', color: '#059669' },
  { key: 'personal', label: 'Personal Task', icon: 'checkmark-circle', color: '#7C3AED' },
  { key: 'reminder', label: 'Reminder', icon: 'notifications', color: '#695030' },
];

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

function useMonthEvents(year: number, month: number, profileId?: string) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

  return useQuery({
    queryKey: ['calendar-events-v2', year, month, profileId],
    queryFn: async () => {
      const [tasks, dprs, deliveries, leaves, attendance, personal] = await Promise.all([
        supabase.from('tasks').select('id,title,start_date,end_date,window_start,status,priority')
          .or(`window_start.gte.${startDate},start_date.gte.${startDate}`)
          .lte('start_date', endDate + 'T23:59:59')
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
        profileId
          ? supabase.from('personal_todos').select('id,title,due_date,created_at,completed_at')
              .eq('profile_id', profileId)
              .then(r => r.data || [])
          : Promise.resolve([]),
      ]);

      const eventsMap: Record<string, CalendarEventItem[]> = {};

      const addEvent = (date: string, evt: CalendarEventItem) => {
        if (!date) return;
        const formattedDate = date.slice(0, 10);
        if (!eventsMap[formattedDate]) eventsMap[formattedDate] = [];
        eventsMap[formattedDate].push(evt);
      };

      tasks.forEach((t: any) => {
        const d = (t.window_start || t.start_date)?.slice(0, 10);
        if (d) addEvent(d, {
          id: t.id,
          type: 'task',
          title: t.title,
          date: d,
          time: t.window_start?.slice(11, 16),
          priority: t.priority === 'high' ? 'p0' : t.priority === 'medium' ? 'p1' : 'p2',
          color: t.priority === 'high' ? colors.error : t.priority === 'medium' ? colors.warning : colors.info,
          completed: t.status === 'done',
        });
      });

      dprs.forEach((d: any) => {
        addEvent(d.date, {
          id: d.id,
          type: 'dpr',
          title: `DPR: ${d.work_type || 'Report'}`,
          date: d.date,
          color: d.status === 'approved' ? colors.success : d.status === 'rejected' ? colors.error : colors.warning,
          completed: d.status === 'approved',
        });
      });

      deliveries.forEach((d: any) => {
        const date = d.created_at?.slice(0, 10);
        if (date) addEvent(date, {
          id: d.id,
          type: 'delivery',
          title: `Delivery ${d.delivery_code || ''}`,
          date,
          color: d.status === 'delivered' ? colors.success : colors.info,
          completed: d.status === 'delivered',
        });
      });

      personal.forEach((p: any) => {
        const d = p.due_date || p.created_at?.slice(0, 10);
        if (d) addEvent(d, {
          id: p.id,
          type: 'personal',
          title: p.title,
          date: d,
          color: '#7C3AED',
          completed: !!p.completed_at,
        });
      });

      return eventsMap;
    },
  });
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Track locally completed items
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());

  // Create Event Modal state
  const [addModal, setAddModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<string>('meeting');
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [eventLocation, setEventLocation] = useState('');
  const [eventPriority, setEventPriority] = useState<'p0' | 'p1' | 'p2'>('p1');
  const [eventDate, setEventDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(COMPLETED_LOCAL_KEY).then((res) => {
      if (res) {
        try { setCompletedSet(new Set(JSON.parse(res))); } catch {}
      }
    });
  }, []);

  const toggleCompleted = async (evt: CalendarEventItem) => {
    const nextSet = new Set(completedSet);
    const isNowDone = !evt.completed && !nextSet.has(evt.id);

    if (isNowDone) nextSet.add(evt.id);
    else nextSet.delete(evt.id);

    setCompletedSet(nextSet);
    await AsyncStorage.setItem(COMPLETED_LOCAL_KEY, JSON.stringify(Array.from(nextSet)));

    // If it's a DB personal todo, sync DB
    if (evt.type === 'personal') {
      await supabase
        .from('personal_todos')
        .update({ completed_at: isNowDone ? new Date().toISOString() : null })
        .eq('id', evt.id);
      qc.invalidateQueries({ queryKey: ['personal-todos'] });
    }
  };

  const deletePersonalEvent = async (id: string) => {
    showAlert(
      'Delete Event',
      'Are you sure you want to remove this personal event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('personal_todos').delete().eq('id', id);
            refetch();
            qc.invalidateQueries({ queryKey: ['personal-todos'] });
          },
        },
      ]
    );
  };

  const { data: eventsMap, refetch, isRefetching } = useMonthEvents(currentYear, currentMonth, profile?.id);
  const days = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const rawDayEvents = eventsMap?.[selectedDate] || [];

  const processedEvents = useMemo(() => {
    return rawDayEvents.map((e) => ({
      ...e,
      completed: e.completed || completedSet.has(e.id),
    }));
  }, [rawDayEvents, completedSet]);

  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'all') return processedEvents;
    if (categoryFilter === 'completed') return processedEvents.filter((e) => e.completed);
    return processedEvents.filter((e) => e.type === categoryFilter);
  }, [processedEvents, categoryFilter]);

  // Analytics for the month
  const monthStats = useMemo(() => {
    let total = 0;
    let meetings = 0;
    let siteVisits = 0;
    let deadlines = 0;

    if (eventsMap) {
      Object.values(eventsMap).forEach((list) => {
        total += list.length;
        list.forEach((e) => {
          if (e.type === 'meeting') meetings++;
          if (e.type === 'site_visit') siteVisits++;
          if (e.type === 'deadline' || e.priority === 'p0') deadlines++;
        });
      });
    }
    return { total, meetings, siteVisits, deadlines };
  }, [eventsMap]);

  const handleCreateEvent = async () => {
    if (!profile?.id) return;
    if (!eventTitle.trim()) {
      showAlert('Title Required', 'Please enter an event title.');
      return;
    }

    setSaving(true);
    try {
      const fullTitle = `${eventTitle.trim()}${eventLocation.trim() ? ` 📍 ${eventLocation.trim()}` : ''}${eventTime ? ` ⏰ ${eventTime}` : ''}`;
      const { error } = await supabase.from('personal_todos').insert({
        profile_id: profile.id,
        title: fullTitle,
        due_date: eventDate,
      });

      if (error) throw error;

      setAddModal(false);
      setEventTitle('');
      setEventLocation('');
      refetch();
      qc.invalidateQueries({ queryKey: ['personal-todos'] });
      showAlert('Event Added ✅', 'Scheduled in your calendar.');
    } catch (e: any) {
      showAlert('Failed', e?.message || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#1E1815" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.headerLabel}>Personal Workspace</Text>
          <Text style={styles.title}>Calendar & Planner</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEventDate(selectedDate); setAddModal(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>New Event</Text>
        </TouchableOpacity>
      </View>

      {/* Month Analytics Strip */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{monthStats.total}</Text>
            <Text style={styles.statLbl}>Month Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#2563EB' }]}>{monthStats.meetings}</Text>
            <Text style={styles.statLbl}>Meetings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#D97706' }]}>{monthStats.siteVisits}</Text>
            <Text style={styles.statLbl}>Site Visits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#DC2626' }]}>{monthStats.deadlines}</Text>
            <Text style={styles.statLbl}>P0 / Deadlines</Text>
          </View>
        </View>
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={20} color="#1E1815" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={20} color="#1E1815" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setCurrentMonth(today.getMonth());
            setCurrentYear(today.getFullYear());
            setSelectedDate(todayStr);
          }}
          style={styles.todayChip}
        >
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
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

              {/* Multi-category event dots */}
              {hasEvents && (
                <View style={styles.eventDots}>
                  {dayEvents.slice(0, 3).map((evt, i) => (
                    <View
                      key={i}
                      style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : evt.color }]}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.xs }}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        <TouchableOpacity
          style={[styles.filterChip, categoryFilter === 'all' && styles.filterChipActive]}
          onPress={() => setCategoryFilter('all')}
        >
          <Text style={[styles.filterText, categoryFilter === 'all' && styles.filterTextActive]}>
            All ({processedEvents.length})
          </Text>
        </TouchableOpacity>

        {EVENT_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterChip, categoryFilter === cat.key && styles.filterChipActive]}
            onPress={() => setCategoryFilter(cat.key)}
          >
            <Ionicons name={cat.icon as any} size={12} color={categoryFilter === cat.key ? '#FFFFFF' : cat.color} />
            <Text style={[styles.filterText, categoryFilter === cat.key && styles.filterTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {filteredEvents.length === 0 && (
          <View style={styles.emptyEvents}>
            <Ionicons name="calendar-outline" size={44} color="#A09080" />
            <Text style={styles.emptyTitle}>No events on this day</Text>
            <Text style={styles.emptyBody}>Tap "+ New Event" to add meetings, site visits, or personal deadlines.</Text>
          </View>
        )}

        {filteredEvents.map((evt) => {
          const isDone = evt.completed;
          const categoryObj = EVENT_CATEGORIES.find((c) => c.key === evt.type);

          return (
            <Card key={evt.id} style={[styles.eventCard, isDone && styles.eventCardDone]} variant="interactive">
              <View style={styles.eventRow}>
                {/* Completion Checkbox */}
                <TouchableOpacity onPress={() => toggleCompleted(evt)} hitSlop={8} style={styles.checkBtn}>
                  <Ionicons
                    name={isDone ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isDone ? '#059669' : evt.color}
                  />
                </TouchableOpacity>

                <View style={styles.eventInfo}>
                  <View style={styles.typeBadgeRow}>
                    <View style={[styles.typeTag, { backgroundColor: evt.color + '15' }]}>
                      <Ionicons name={(categoryObj?.icon || 'time-outline') as any} size={11} color={evt.color} />
                      <Text style={[styles.typeTagText, { color: evt.color }]}>
                        {(categoryObj?.label || evt.type).toUpperCase()}
                      </Text>
                    </View>
                    {evt.priority === 'p0' && (
                      <View style={styles.p0Badge}>
                        <Text style={styles.p0Text}>CRITICAL P0</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.eventTitle, isDone && styles.eventTitleDone]}>{evt.title}</Text>
                  {evt.time && <Text style={styles.eventMeta}>⏰ {evt.time}</Text>}
                </View>

                {evt.type === 'personal' && (
                  <TouchableOpacity onPress={() => deletePersonalEvent(evt.id)} hitSlop={8} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* New Event Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAddModal(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Schedule New Event</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.catChip, eventCategory === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => setEventCategory(cat.key)}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={eventCategory === cat.key ? '#FFF' : cat.color} />
                    <Text style={[styles.catChipText, eventCategory === cat.key && { color: '#FFF', fontFamily: fontFamily.bold }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Event Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Facade Inspection with Structural Engineer"
                placeholderTextColor="#8B7E74"
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Time (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10:30 AM"
                    placeholderTextColor="#8B7E74"
                    value={eventTime}
                    onChangeText={setEventTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Location (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tower B — Site Office"
                    placeholderTextColor="#8B7E74"
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {[
                  { key: 'p0', label: '🔴 P0 Critical' },
                  { key: 'p1', label: '🟡 P1 High' },
                  { key: 'p2', label: '🟢 P2 Normal' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.priorityChip, eventPriority === p.key && styles.priorityChipActive]}
                    onPress={() => setEventPriority(p.key as any)}
                  >
                    <Text style={[styles.priorityText, eventPriority === p.key && styles.priorityTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Event Date</Text>
              <DatePickerField label="Select Date" value={eventDate} onChange={setEventDate} />

              <View style={{ height: spacing.lg }} />

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateEvent} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
                <Text style={styles.saveBtnText}>{saving ? 'Saving Event…' : 'Schedule Event'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', paddingHorizontal: spacing.lg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  headerLabel: { fontSize: 12, color: '#8B7E74', fontFamily: fontFamily.medium },
  title: { fontSize: 24, color: '#1E1815', fontFamily: fontFamily.bold },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#695030', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 20, shadowColor: '#695030', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  addBtnText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#FFFFFF' },

  // Stats Card
  statsCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  statLbl: { fontSize: 10, fontFamily: fontFamily.medium, color: '#8B7E74', marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(105,80,48,0.1)' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs, backgroundColor: '#FFFFFF', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)' },
  arrowBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5EFE6', alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815' },
  todayChip: { backgroundColor: '#695030', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  todayText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#FFFFFF' },

  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: fontFamily.bold, color: '#8B7E74' },

  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.08,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dayCellSelected: { backgroundColor: '#695030' },
  dayCellToday: { borderWidth: 1.5, borderColor: '#695030', backgroundColor: '#F5EFE6' },
  dayText: { fontSize: 13, fontFamily: fontFamily.medium, color: '#1E1815' },
  dayTextFaded: { color: colors.neutral[300] },
  dayTextSelected: { color: '#FFFFFF', fontFamily: fontFamily.bold },
  dayTextToday: { color: '#695030', fontFamily: fontFamily.bold },
  eventDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  eventDot: { width: 4, height: 4, borderRadius: 2 },

  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F5EFE6', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' },
  filterChipActive: { backgroundColor: '#695030', borderColor: '#695030' },
  filterText: { fontSize: 11, fontFamily: fontFamily.medium, color: '#8B7E74' },
  filterTextActive: { color: '#FFFFFF', fontFamily: fontFamily.bold },

  emptyEvents: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyBody: { fontSize: 12, color: '#8B7E74', textAlign: 'center', paddingHorizontal: 30 },

  eventCard: { padding: spacing.md, marginBottom: spacing.xs, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)' },
  eventCardDone: { opacity: 0.6 },
  eventRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  checkBtn: { padding: 2 },
  eventInfo: { flex: 1 },
  typeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeTagText: { fontSize: 9, fontFamily: fontFamily.bold },
  p0Badge: { backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  p0Text: { fontSize: 8, fontFamily: fontFamily.bold, color: '#FFF' },
  eventTitle: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },
  eventTitleDone: { textDecorationLine: 'line-through', color: '#8B7E74' },
  eventMeta: { fontSize: 11, color: '#8B7E74', marginTop: 2, fontFamily: fontFamily.medium },
  deleteBtn: { padding: 6, borderRadius: 10, backgroundColor: 'rgba(220,38,38,0.08)' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.md },

  fieldLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: '#8B7E74', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: spacing.xs },
  textInput: { backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 13, color: '#1E1815', fontFamily: fontFamily.regular, marginBottom: spacing.xs },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: '#F9FAFB' },
  catChipText: { fontSize: 12, fontFamily: fontFamily.medium, color: '#1E1815' },

  priorityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  priorityChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: '#F9FAFB' },
  priorityChipActive: { borderColor: '#695030', backgroundColor: '#F5EFE6' },
  priorityText: { fontSize: 12, fontFamily: fontFamily.medium, color: '#8B7E74' },
  priorityTextActive: { color: '#695030', fontFamily: fontFamily.bold },

  saveBtn: { borderRadius: 18, backgroundColor: '#695030', paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, shadowColor: '#695030', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  saveBtnText: { fontSize: 15, fontFamily: fontFamily.bold, color: '#FFFFFF' },
});
