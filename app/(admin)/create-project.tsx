import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, GradientButton, Card, Input, DatePickerField, AddressAutocomplete, StaticMapPreview } from '../../src/components';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { typography, fontFamily } from '../../src/theme/typography';
import { showAlert } from '../../src/utils/alert';

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
  const [projectImageUri, setProjectImageUri] = useState<string | null>(null);

  const pickProjectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'We need library access to upload a project photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled) {
      setProjectImageUri(result.assets[0].uri);
    }
  };

  const locateSiteFromAddress = async () => {
    if (!address.trim()) { showAlert('Site address needed', 'Enter the project site address first.'); return; }
    setLocating(true);
    try {
      const results = await Location.geocodeAsync(`${address.trim()}, ${city.trim()}`);
      if (!results.length) { showAlert('Site not found', 'Check the site address and city, then try again.'); return; }
      setLat(results[0].latitude.toFixed(6));
      setLng(results[0].longitude.toFixed(6));
    } catch (e: any) {
      showAlert('Could not locate site', e?.message || 'Check the address and try again.');
    } finally { setLocating(false); }
  };

  const [radius, setRadius] = useState(100);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<string[]>([]);

  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_templates').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignablePeople = [] } = useQuery({
    queryKey: ['assignable-project-people'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role').in('role', ['worker', 'supervisor', 'project_manager']).eq('status', 'active').order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const selectedTemplate = useMemo(() => templates.find((t: any) => t.id === templateId), [templates, templateId]);

  const canContinue = () => {
    if (step === 1 && !name.trim()) {
      showAlert('Name required', 'Please enter a project name.');
      return false;
    }
    if (step === 2 && !address.trim()) {
      showAlert('Address required', 'Please enter the site address.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (canContinue()) {
      setStep((s) => s + 1);
    }
  };

  const save = async () => {
    if (!profile?.company_id || !name.trim() || !address.trim()) {
      showAlert('Required Fields', 'Project name and site address are required.');
      return;
    }
    if ((lat && Number.isNaN(Number(lat))) || (lng && Number.isNaN(Number(lng)))) {
      showAlert('Invalid coordinates', 'Enter valid latitude and longitude.');
      return;
    }
    setSaving(true);
    try {
      let uploadedImageUrl = null;
      if (projectImageUri) {
        const response = await fetch(projectImageUri);
        const bytes = await response.arrayBuffer();
        const ext = projectImageUri.split('.').pop() || 'jpg';
        const path = `projects/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, bytes, {
            contentType: 'image/jpeg',
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
        uploadedImageUrl = urlData.publicUrl;
      }

      const { data: project, error } = await supabase.from('projects').insert({
        company_id: profile.company_id,
        name: name.trim(), type, city: city.trim(), address: address.trim(),
        lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
        geofence_radius_m: radius, start_date: startDate || null,
        expected_end_date: endDate || null, status: 'on_track', progress_pct: 0,
        image_url: uploadedImageUrl,
      }).select('*').single();

      if (error) throw error;

      if (assignedWorkerIds.length) {
        const { error: assignmentError } = await supabase.from('assignments').insert(assignedWorkerIds.map((profile_id) => ({ project_id: project.id, profile_id, active: true })));
        if (assignmentError) throw assignmentError;
      }

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
      showAlert('Project created', 'Workspace, geofence and template tasks are ready.', [
        { text: 'Open Project', onPress: () => router.replace({ pathname: '/(admin)/project-workspace', params: { id: project.id } as any }) },
      ]);
    } catch (e: any) {
      showAlert('Could not create project', e.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const steps = ['Template', 'Details', 'Site', 'Schedule'];
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.ink} /></TouchableOpacity>
        <Text style={styles.title}>New Project</Text><View style={{ width: 24 }} />
      </View>
      <View style={styles.stepRow}>
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View style={[styles.dot, i <= step && styles.dotActive, i < step && styles.dotCompleted]}>
                {i < step ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.dotText, i === step && styles.dotTextActive]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, i <= step && { color: colors.ink }]}>{label}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && <>
          <Text style={styles.heading}>Choose a project template</Text><Text style={styles.help}>Templates create standard tasks and recurring safety checks automatically.</Text>
          <TouchableOpacity onPress={() => setTemplateId(null)}><Card style={[styles.option, templateId === null && styles.selected]}><Text style={styles.optionTitle}>Start from scratch</Text><Ionicons name={templateId === null ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={colors.primary} /></Card></TouchableOpacity>
          {templates.map((item: any) => <TouchableOpacity key={item.id} onPress={() => setTemplateId(item.id)}><Card style={[styles.option, templateId === item.id && styles.selected]}><View style={{ flex: 1 }}><Text style={styles.optionTitle}>{item.name}</Text><Text style={styles.optionMeta}>{item.payload?.tasks?.length || 0} tasks • {item.payload?.recurring_tasks?.length || 0} recurring</Text></View><Ionicons name={templateId === item.id ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={colors.primary} /></Card></TouchableOpacity>)}
        </>}
        {step === 1 && <>
          <Text style={styles.heading}>Project details</Text>
          <Input label="Project Name *" value={name} onChangeText={setName} placeholder="e.g. Baner Commercial Tower" />
          <View style={styles.gap} />
          
          <Text style={styles.fieldLabel}>Project Photo (Optional)</Text>
          <TouchableOpacity onPress={pickProjectImage} style={styles.uploadCard}>
            {projectImageUri ? (
              <Image source={{ uri: projectImageUri }} style={styles.projectImagePreview} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={colors.neutral[400]} />
                <Text style={styles.uploadPlaceholderText}>Upload Project Image</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.gap} />

          <Text style={styles.fieldLabel}>Project Type</Text>
          <View style={styles.chips}>{TYPES.map((item) => <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.chipActive]}><Text style={[styles.chipText, type === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View>
          <Input label="City" value={city} onChangeText={setCity} placeholder="Pune" />
        </>}
        {step === 2 && <>
          <Text style={styles.heading}>Site & geofence</Text>
          <AddressAutocomplete
            value={address}
            onChangeText={setAddress}
            city={city}
            onLocationSelected={(latitude, longitude, formattedAddress) => {
              setLat(latitude);
              setLng(longitude);
              setAddress(formattedAddress);
            }}
          />
          <StaticMapPreview lat={lat} lng={lng} />
          <Text style={styles.fieldLabel}>Geofence radius</Text>
          <View style={styles.chips}>{RADII.map((item) => <TouchableOpacity key={item} onPress={() => setRadius(item)} style={[styles.chip, radius === item && styles.chipActive]}><Text style={[styles.chipText, radius === item && styles.chipTextActive]}>{item} m</Text></TouchableOpacity>)}</View>
          <Card style={styles.info}><Ionicons name="location" size={20} color={colors.primary} /><Text style={styles.infoText}>Workers must be within {radius} metres to punch in. Coordinates can be added later if unavailable.</Text></Card>
        </>}
        {step === 3 && <><Text style={styles.heading}>Schedule & review</Text><DatePickerField label="Start Date" value={startDate} onChange={setStartDate} /><View style={styles.gap} /><DatePickerField label="Expected End Date" value={endDate} onChange={setEndDate} minDate={startDate || undefined} /><Text style={styles.fieldLabel}>Assign workers and supervisors</Text><Text style={styles.help}>Only assigned people will be shown for this site and use its geofence for punch-in.</Text><View style={styles.chips}>{assignablePeople.map((person: any) => { const active = assignedWorkerIds.includes(person.id); return <TouchableOpacity key={person.id} onPress={() => setAssignedWorkerIds((ids) => active ? ids.filter((id) => id !== person.id) : [...ids, person.id])} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{person.full_name} · {person.role}</Text></TouchableOpacity>; })}</View><Card style={styles.review}><Text style={styles.reviewTitle}>{name || 'Untitled project'}</Text><Text style={styles.reviewLine}>{type} • {city || 'No city'}</Text><Text style={styles.reviewLine}>{address || 'No address'}</Text><Text style={styles.reviewLine}>Geofence: {radius} m</Text><Text style={styles.reviewLine}>Template: {selectedTemplate?.name || 'None'}</Text><Text style={styles.reviewLine}>Assigned people: {assignedWorkerIds.length}</Text></Card></>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} style={styles.footerButton} />}
        <GradientButton title={step === 3 ? 'Create Project' : 'Continue'} onPress={step === 3 ? save : handleNext} loading={saving} style={styles.footerButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48 },
  title: { ...typography.h4, color: colors.ink },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderColor: colors.divider, backgroundColor: colors.white },
  stepItem: { alignItems: 'center', gap: 6 },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.neutral[200], marginHorizontal: spacing.sm, marginBottom: 20 },
  stepLineActive: { backgroundColor: colors.primary },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.neutral[200] },
  dotActive: { backgroundColor: colors.white, borderColor: colors.primary, borderWidth: 2 },
  dotCompleted: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotText: { ...typography.caption, color: colors.neutral[500], fontFamily: fontFamily.semiBold },
  dotTextActive: { color: colors.primary },
  stepLabel: { ...typography.caption, fontSize: 11, color: colors.neutral[500], fontFamily: fontFamily.medium },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  heading: { ...typography.h4, color: colors.ink, marginBottom: spacing.xs },
  help: { ...typography.bodySmall, color: colors.neutral[500], marginBottom: spacing.lg },
  option: { padding: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  selected: { borderWidth: 2, borderColor: colors.primary },
  optionTitle: { ...typography.h6, color: colors.ink },
  optionMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 3 },
  gap: { height: spacing.md },
  fieldLabel: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, marginBottom: spacing.sm, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.neutral[700] },
  chipTextActive: { color: colors.white },
  inline: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  info: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.tertiary + '22' },
  infoText: { flex: 1, ...typography.bodySmall, color: colors.neutral[700] },
  review: { padding: spacing.lg, marginTop: spacing.xl, gap: spacing.xs },
  reviewTitle: { ...typography.h5, color: colors.ink },
  reviewLine: { ...typography.bodySmall, color: colors.neutral[600] },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  footerButton: { flex: 1 },
  uploadCard: {
    height: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    backgroundColor: colors.white,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  projectImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  uploadPlaceholderText: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    fontFamily: fontFamily.medium,
  },
});
