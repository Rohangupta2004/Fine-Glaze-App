import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Input } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { spacing } from '../../src/theme/spacing';
import { typography, fontFamily } from '../../src/theme/typography';
import { showAlert } from '../../src/utils/alert';

export default function AssignSiteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [zone, setZone] = useState('');
  const [shift, setShift] = useState<'General Shift (09:00 - 18:00)' | 'Day Shift (08:00 - 17:00)' | 'Night Shift (20:00 - 05:00)' | 'Custom Shift'>('General Shift (09:00 - 18:00)');
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,city')
        .neq('status', 'completed')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ['assignable-people'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,role,worker_id,status')
        .in('role', ['worker', 'supervisor'])
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function resolveShiftTimes(shiftName: string) {
    if (shiftName.includes('Day Shift')) return { start: '08:00:00', end: '17:00:00' };
    if (shiftName.includes('Night Shift')) return { start: '20:00:00', end: '05:00:00' };
    if (shiftName.includes('Custom')) return { start: `${customStartTime}:00`, end: `${customEndTime}:00` };
    return { start: '09:00:00', end: '18:00:00' };
  }

  const save = async () => {
    if (!selectedProjectIds.length || !selected.length) {
      showAlert('Select project(s) and team', 'Choose at least one project and one worker/supervisor.');
      return;
    }
    setSaving(true);
    try {
      const { start: shift_start, end: shift_end } = resolveShiftTimes(shift);

      const rows = selectedProjectIds.flatMap((pId) =>
        selected.map((id) => ({
          project_id: pId,
          profile_id: id,
          role_on_site: people.find((p: any) => p.id === id)?.role || 'worker',
          level_zone: [zone.trim(), shift].filter(Boolean).join(' • ') || null,
          shift_start,
          shift_end,
          active: true,
        }))
      );

      const { error } = await supabase
        .from('assignments')
        .upsert(rows, { onConflict: 'project_id,profile_id' });
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ['assignments'] });
      showAlert('Teams & Shifts assigned', `${selected.length} team member(s) assigned across ${selectedProjectIds.length} site(s) with shift hours (${shift_start.slice(0, 5)} - ${shift_end.slice(0, 5)}).`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      showAlert('Assignment failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E1815" />
        </TouchableOpacity>
        <Text style={styles.title}>Assign Sites & Shifts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Project(s) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={styles.heading}>1. Select site(s) / project(s)</Text>
          <TouchableOpacity onPress={() => setSelectedProjectIds(selectedProjectIds.length === projects.length ? [] : projects.map((p: any) => p.id))}>
            <Text style={styles.selectAll}>{selectedProjectIds.length === projects.length ? 'Clear' : 'Select all'}</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {projects.map((p: any) => {
            const isSel = selectedProjectIds.includes(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => toggleProject(p.id)}
                style={[styles.projectCard, isSel && styles.projectCardActive]}
                activeOpacity={0.85}
              >
                <Ionicons name="business" size={20} color={isSel ? '#FFFFFF' : '#695030'} />
                <Text style={[styles.projectName, isSel && styles.projectNameActive]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.cityText, isSel && styles.cityTextActive]}>
                  {p.city || 'Site'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.gap} />

        {/* Shift Options for Multi-shift */}
        <Text style={styles.heading}>Assign Shift Hours</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, marginBottom: spacing.sm }}>
          {(['General Shift (09:00 - 18:00)', 'Day Shift (08:00 - 17:00)', 'Night Shift (20:00 - 05:00)', 'Custom Shift'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setShift(s)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: 20,
                backgroundColor: shift === s ? '#695030' : '#F5F2EC',
                borderWidth: 1,
                borderColor: shift === s ? '#695030' : 'rgba(184, 144, 71, 0.2)',
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: fontFamily.semiBold, color: shift === s ? '#fff' : '#1E1815' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {shift === 'Custom Shift' && (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Shift Start Time (HH:MM)"
                value={customStartTime}
                onChangeText={setCustomStartTime}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Shift End Time (HH:MM)"
                value={customEndTime}
                onChangeText={setCustomEndTime}
                placeholder="18:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        )}

        <Input
          label="Level / Zone (optional)"
          value={zone}
          onChangeText={setZone}
          placeholder="e.g. Tower A — East Facade"
        />

        {/* Step 2: Select Team */}
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>2. Select team</Text>
          <TouchableOpacity
            onPress={() =>
              setSelected(
                selected.length === people.length ? [] : people.map((p: any) => p.id)
              )
            }
          >
            <Text style={styles.selectAll}>
              {selected.length === people.length ? 'Clear' : 'Select all'}
            </Text>
          </TouchableOpacity>
        </View>

        {people.map((p: any) => {
          const isSel = selected.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => toggle(p.id)}
              activeOpacity={0.85}
              style={styles.personWrap}
            >
              <View style={[styles.personCard, isSel && styles.personCardActive]}>
                <View style={[styles.avatar, isSel && styles.avatarActive]}>
                  <Text style={[styles.initial, isSel && styles.initialActive]}>
                    {p.full_name?.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{p.full_name}</Text>
                  <Text style={styles.meta}>
                    {p.role.replace('_', ' ')}
                    {p.worker_id ? ` • ${p.worker_id}` : ''}
                  </Text>
                </View>
                <Ionicons
                  name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSel ? '#695030' : '#A09080'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Text style={styles.count}>{selected.length} selected</Text>
        <Button
          title="Assign to Site"
          onPress={save}
          loading={saving}
          disabled={!selectedProjectIds.length || !selected.length}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h5, color: '#1E1815', fontFamily: fontFamily.semiBold },
  content: { padding: spacing.lg, paddingBottom: 120 },
  heading: { ...typography.h6, color: '#1E1815', fontFamily: fontFamily.semiBold, marginBottom: spacing.sm },

  projectCard: {
    width: 140,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#F5F2EC',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    gap: 4,
  },
  projectCardActive: {
    backgroundColor: '#695030',
    borderColor: '#695030',
  },
  projectName: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  projectNameActive: { color: '#FFFFFF' },
  cityText: { ...typography.caption, color: '#695030', fontSize: 11 },
  cityTextActive: { color: 'rgba(255, 255, 255, 0.8)' },

  gap: { height: spacing.lg },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  selectAll: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: '#695030' },

  personWrap: {
    marginBottom: spacing.xs,
  },
  personCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F5F2EC',
    borderColor: 'rgba(184, 144, 71, 0.22)',
    borderWidth: 1.2,
    borderRadius: 18,
  },
  personCardActive: {
    backgroundColor: 'rgba(105, 80, 48, 0.08)',
    borderColor: '#695030',
    borderWidth: 1.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(105, 80, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: '#695030',
  },
  initial: { ...typography.h6, color: '#695030', fontFamily: fontFamily.semiBold },
  initialActive: { color: '#FFFFFF' },
  personName: { ...typography.bodyMedium, color: '#1E1815', fontFamily: fontFamily.semiBold },
  meta: { ...typography.caption, color: '#695030', textTransform: 'capitalize', fontSize: 11 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: '#F5F2EC',
    borderTopWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  count: { ...typography.bodyMedium, color: '#695030', fontFamily: fontFamily.medium },
});
