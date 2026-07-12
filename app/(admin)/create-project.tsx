import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Input, DatePickerField } from '../../src/components';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { typography, fontFamily } from '../../src/theme/typography';

const TYPES = ['Commercial Building', 'Residential Facade', 'Curtain Wall', 'Structural Glazing', 'Maintenance'];
const RADII = [50, 100, 150, 200];

export default function CreateProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [city, setCity] = useState('Pune');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to auto-fill the site coordinates.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch (e: any) {
      Alert.alert('Could not get location', e?.message || 'Try again near a window or outdoors.');
    } finally {
      setLocating(false);
    }
  };
  const [radius, setRadius] = useState(100);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_templates').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });
  const selectedTemplate = useMemo(() => templates.find((t: any) => t.id === templateId), [templates, templateId]);

  const save = async () => {
    if (!profile?.company_id || !name.trim() || !address.trim()) {
      Alert.alert('Missing details', 'Project name and site address are required.');
      return;
    }
    if ((lat && Number.isNaN(Number(lat))) || (lng && Number.isNaN(Number(lng)))) {
      Alert.alert('Invalid coordinates', 'Enter valid latitude and longitude.');
      return;
    }
    setSaving(true);
    try {
      const { data: project, error } = await supabase.from('projects').insert({
        company_id: profile.company_id,
        name: name.trim(), type, city: city.trim(), address: address.trim(),
        lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
        geofence_radius_m: radius, start_date: startDate || null,
        expected_end_date: endDate || null, status: 'on_track', progress_pct: 0,
      }).select('*').single();
      if (error) throw error;

      const payload = selectedTemplate?.payload || {};
      const taskTitles: string[] = payload.tasks || [];
      if (taskTitles.length) {
        const { error: taskError } = await supabase.from('tasks').insert(taskTitles.map((title) => ({
          project_id: project.id, title, priority: 'medium', status: 'pending', created_by: profile.id,
        })));
        if (taskError) throw taskError;
      }
      const recurring: string[] = payload.recurring_tasks || [];
      if (recurring.length) {
        const { error: recurringError } = await supabase.from('recurring_tasks').insert(recurring.map((title) => ({
          company_id: profile.company_id, project_id: project.id, title, priority: 'medium', frequency: 'daily', active: true,
        })));
        if (recurringError) throw recurringError;
      }
      await qc.invalidateQueries({ queryKey: ['projects'] });
      Alert.alert('Project created', 'Workspace, geofence and template tasks are ready.', [
        { text: 'Open Project', onPress: () => router.replace({ pathname: '/(admin)/project-workspace', params: { projectId: project.id } }) },
      ]);
    } catch (e: any) {
      Alert.alert('Could not create project', e.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const steps = ['Template', 'Details', 'Site', 'Schedule'];
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.ink} /></TouchableOpacity>
        <Text style={styles.title}>New Project</Text><View style={{ width: 24 }} />
      </View>
      <View style={styles.stepRow}>{steps.map((label, i) => <View key={label} style={styles.stepItem}><View style={[styles.dot, i <= step && styles.dotActive]}><Text style={[styles.dotText, i <= step && styles.dotTextActive]}>{i + 1}</Text></View><Text style={styles.stepLabel}>{label}</Text></View>)}</View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && <>
          <Text style={styles.heading}>Choose a project template</Text><Text style={styles.help}>Templates create standard tasks and recurring safety checks automatically.</Text>
          <TouchableOpacity onPress={() => setTemplateId(null)}><Card style={[styles.option, templateId === null && styles.selected]}><Text style={styles.optionTitle}>Start from scratch</Text><Ionicons name={templateId === null ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={colors.primary} /></Card></TouchableOpacity>
          {templates.map((item: any) => <TouchableOpacity key={item.id} onPress={() => setTemplateId(item.id)}><Card style={[styles.option, templateId === item.id && styles.selected]}><View style={{ flex: 1 }}><Text style={styles.optionTitle}>{item.name}</Text><Text style={styles.optionMeta}>{item.payload?.tasks?.length || 0} tasks • {item.payload?.recurring_tasks?.length || 0} recurring</Text></View><Ionicons name={templateId === item.id ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={colors.primary} /></Card></TouchableOpacity>)}
        </>}
        {step === 1 && <><Text style={styles.heading}>Project details</Text><Input label="Project Name *" value={name} onChangeText={setName} placeholder="e.g. Baner Commercial Tower" /><View style={styles.gap} /><Text style={styles.fieldLabel}>Project Type</Text><View style={styles.chips}>{TYPES.map((item) => <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.chipActive]}><Text style={[styles.chipText, type === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View><Input label="City" value={city} onChangeText={setCity} placeholder="Pune" /></>}
        {step === 2 && <><Text style={styles.heading}>Site & geofence</Text><Input label="Full Site Address *" value={address} onChangeText={setAddress} placeholder="Building, road, area, city" multiline /><View style={styles.gap} /><Button title={locating ? 'Getting GPS location…' : '📍 Use My Current Location'} variant="secondary" onPress={useMyLocation} loading={locating} fullWidth /><View style={styles.gap} /><View style={styles.inline}><View style={styles.flex}><Input label="Latitude" value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="Auto-filled from GPS" /></View><View style={styles.flex}><Input label="Longitude" value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="Auto-filled from GPS" /></View></View><Text style={styles.fieldLabel}>Geofence radius</Text><View style={styles.chips}>{RADII.map((item) => <TouchableOpacity key={item} onPress={() => setRadius(item)} style={[styles.chip, radius === item && styles.chipActive]}><Text style={[styles.chipText, radius === item && styles.chipTextActive]}>{item} m</Text></TouchableOpacity>)}</View><Card style={styles.info}><Ionicons name="location" size={20} color={colors.primary} /><Text style={styles.infoText}>Workers must be within {radius} metres to punch in. Coordinates can be added later if unavailable.</Text></Card></>}
        {step === 3 && <><Text style={styles.heading}>Schedule & review</Text><DatePickerField label="Start Date" value={startDate} onChange={setStartDate} /><View style={styles.gap} /><DatePickerField label="Expected End Date" value={endDate} onChange={setEndDate} minDate={startDate || undefined} /><Card style={styles.review}><Text style={styles.reviewTitle}>{name || 'Untitled project'}</Text><Text style={styles.reviewLine}>{type} • {city || 'No city'}</Text><Text style={styles.reviewLine}>{address || 'No address'}</Text><Text style={styles.reviewLine}>Geofence: {radius} m</Text><Text style={styles.reviewLine}>Template: {selectedTemplate?.name || 'None'}</Text></Card></>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{step > 0 && <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} style={styles.footerButton} />}<Button title={step === 3 ? 'Create Project' : 'Continue'} onPress={step === 3 ? save : () => setStep((s) => s + 1)} loading={saving} style={styles.footerButton} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48 }, title: { ...typography.h4, color: colors.ink },
  stepRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.divider }, stepItem: { flex: 1, alignItems: 'center', gap: 4 }, dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' }, dotActive: { backgroundColor: colors.primary }, dotText: { ...typography.caption, color: colors.neutral[600] }, dotTextActive: { color: colors.white }, stepLabel: { ...typography.caption, fontSize: 10, color: colors.neutral[600] },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] }, heading: { ...typography.h4, color: colors.ink, marginBottom: spacing.xs }, help: { ...typography.bodySmall, color: colors.neutral[500], marginBottom: spacing.lg }, option: { padding: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }, selected: { borderWidth: 2, borderColor: colors.primary }, optionTitle: { ...typography.h6, color: colors.ink }, optionMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 3 }, gap: { height: spacing.md }, fieldLabel: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, marginBottom: spacing.sm, marginTop: spacing.md }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }, chip: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { ...typography.caption, color: colors.neutral[700] }, chipTextActive: { color: colors.white }, inline: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 }, info: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.tertiary + '22' }, infoText: { flex: 1, ...typography.bodySmall, color: colors.neutral[700] }, review: { padding: spacing.lg, marginTop: spacing.xl, gap: spacing.xs }, reviewTitle: { ...typography.h5, color: colors.ink }, reviewLine: { ...typography.bodySmall, color: colors.neutral[600] }, footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }, footerButton: { flex: 1 },
});
