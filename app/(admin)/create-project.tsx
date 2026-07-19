import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

import {
  Button,
  GradientButton,
  Card,
  Input,
  DatePickerField,
  AddressAutocomplete,
  StaticMapPreview,
  SearchBar,
} from '../../src/components';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { typography, fontFamily } from '../../src/theme/typography';
import { showAlert } from '../../src/utils/alert';
import { useMaterialMaster, MaterialMasterItem } from '../../src/hooks/useBOQ';

const TYPES = ['Commercial Building', 'Residential Facade', 'Curtain Wall', 'Structural Glazing', 'Maintenance'];
const RADII = [50, 100, 150, 200];

interface ParsedBOQRow {
  index: number;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  matchedId: string | null;
  matchedName: string | null;
  confidence: number;
  matchType: string;
  learnAlias: boolean;
}

export default function CreateProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Details
  const [name, setName] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [city, setCity] = useState('Pune');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [projectImageUri, setProjectImageUri] = useState<string | null>(null);

  // Site / Radius / Schedule
  const [radius, setRadius] = useState(100);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<string[]>([]);

  // BOQ Upload states
  const { data: masterMaterials = [] } = useMaterialMaster();
  const [parsedBoqItems, setParsedBoqItems] = useState<ParsedBOQRow[]>([]);
  const [isBOQLoading, setIsBOQLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [masterSearch, setMasterSearch] = useState('');

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

  // Excel parsing logic helper functions
  const detectColumns = (row: any[]) => {
    let itemCol = -1;
    let descCol = -1;
    let qtyCol = -1;
    let unitCol = -1;
    let rateCol = -1;
    let amtCol = -1;

    row.forEach((cell, idx) => {
      if (cell === null || cell === undefined) return;
      const txt = String(cell).toLowerCase().trim();
      if (
        txt.includes('item') ||
        txt.includes('particular') ||
        txt.includes('name') ||
        txt.includes('material') ||
        txt.match(/^desc$/)
      ) {
        if (itemCol === -1) itemCol = idx;
      } else if (
        txt.includes('desc') ||
        txt.includes('spec') ||
        txt.includes('detail')
      ) {
        if (descCol === -1) descCol = idx;
      } else if (
        txt.includes('qty') ||
        txt.includes('quantity') ||
        txt.includes('vol')
      ) {
        if (qtyCol === -1) qtyCol = idx;
      } else if (
        txt.includes('unit') ||
        txt.includes('uom') ||
        txt.includes('measure')
      ) {
        if (unitCol === -1) unitCol = idx;
      } else if (
        txt.includes('rate') ||
        txt.includes('price') ||
        txt.includes('cost')
      ) {
        if (rateCol === -1) rateCol = idx;
      } else if (
        txt.includes('amount') ||
        txt.includes('total') ||
        txt.includes('value')
      ) {
        if (amtCol === -1) amtCol = idx;
      }
    });

    return { itemCol, descCol, qtyCol, unitCol, rateCol, amtCol };
  };

  const findBestMatch = (itemName: string, materials: MaterialMasterItem[]) => {
    const cleanItem = itemName.toLowerCase().trim();
    if (!cleanItem) return { material: null, score: 0, type: 'none' };

    // exact match
    for (const m of materials) {
      if (m.name.toLowerCase().trim() === cleanItem) {
        return { material: m, score: 100, type: 'exact' };
      }
    }

    // alias match
    for (const m of materials) {
      for (const alias of m.aliases || []) {
        if (alias.toLowerCase().trim() === cleanItem) {
          return { material: m, score: 95, type: 'alias' };
        }
      }
    }

    // substring/fuzzy
    let bestMatch: MaterialMasterItem | null = null;
    let bestScore = 0;
    let matchType = '';

    for (const m of materials) {
      const mName = m.name.toLowerCase().trim();
      if (cleanItem.includes(mName) || mName.includes(cleanItem)) {
        const score = Math.round(
          (Math.min(mName.length, cleanItem.length) / Math.max(mName.length, cleanItem.length)) * 90
        );
        if (score > bestScore) {
          bestScore = score;
          bestMatch = m;
          matchType = 'fuzzy';
        }
      }

      for (const alias of m.aliases || []) {
        const cleanAlias = alias.toLowerCase().trim();
        if (cleanItem.includes(cleanAlias) || cleanAlias.includes(cleanItem)) {
          const score = Math.round(
            (Math.min(cleanAlias.length, cleanItem.length) / Math.max(cleanAlias.length, cleanItem.length)) * 85
          );
          if (score > bestScore) {
            bestScore = score;
            bestMatch = m;
            matchType = 'fuzzy-alias';
          }
        }
      }
    }

    if (bestScore >= 40 && bestMatch) {
      return { material: bestMatch, score: bestScore, type: matchType };
    }

    return { material: null, score: 0, type: 'none' };
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBOQLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          throw new Error('Excel sheet is empty');
        }

        let bestHeaderIndex = 0;
        let bestCols = { itemCol: -1, descCol: -1, qtyCol: -1, unitCol: -1, rateCol: -1, amtCol: -1 };
        let maxMatchedCount = 0;

        for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
          const row = jsonData[r];
          if (!Array.isArray(row)) continue;
          const cols = detectColumns(row);
          let matchedCount = 0;
          if (cols.itemCol !== -1) matchedCount++;
          if (cols.qtyCol !== -1) matchedCount++;
          if (cols.unitCol !== -1) matchedCount++;

          if (matchedCount > maxMatchedCount) {
            maxMatchedCount = matchedCount;
            bestHeaderIndex = r;
            bestCols = cols;
          }
        }

        if (bestCols.itemCol === -1 || bestCols.qtyCol === -1) {
          throw new Error('Could not identify Item Name or Quantity columns.');
        }

        const rows: ParsedBOQRow[] = [];
        for (let i = bestHeaderIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!Array.isArray(row)) continue;

          const itemName = row[bestCols.itemCol] ? String(row[bestCols.itemCol]).trim() : '';
          const quantity = parseFloat(row[bestCols.qtyCol]);
          if (!itemName || isNaN(quantity)) continue;

          const description = bestCols.descCol !== -1 && row[bestCols.descCol] ? String(row[bestCols.descCol]).trim() : '';
          const unit = bestCols.unitCol !== -1 && row[bestCols.unitCol] ? String(row[bestCols.unitCol]).trim() : 'nos';
          const rate = bestCols.rateCol !== -1 && !isNaN(parseFloat(row[bestCols.rateCol])) ? parseFloat(row[bestCols.rateCol]) : 0;
          const amount = bestCols.amtCol !== -1 && !isNaN(parseFloat(row[bestCols.amtCol])) ? parseFloat(row[bestCols.amtCol]) : rate * quantity;

          const matchResult = findBestMatch(itemName, masterMaterials);

          rows.push({
            index: i,
            itemName,
            description,
            quantity,
            unit,
            rate,
            amount,
            matchedId: matchResult.material?.id || null,
            matchedName: matchResult.material?.name || null,
            confidence: matchResult.score,
            matchType: matchResult.type,
            learnAlias: matchResult.score > 0 && matchResult.score < 100,
          });
        }

        setParsedBoqItems(rows);
      } catch (err: any) {
        showAlert('Import failed', err.message || 'Could not parse BOQ sheet');
      } finally {
        setIsBOQLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const triggerWebFileInput = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls';
      input.onchange = handleFileChange;
      input.click();
    }
  };

  const openReassignModal = (rowIndex: number) => {
    setActiveRowIndex(rowIndex);
    setMasterSearch('');
    setIsModalOpen(true);
  };

  const handleSelectMaterial = (material: MaterialMasterItem | null) => {
    if (activeRowIndex === null) return;
    const updated = [...parsedBoqItems];
    const row = updated[activeRowIndex];

    if (material) {
      row.matchedId = material.id;
      row.matchedName = material.name;
      row.confidence = 100;
      row.matchType = 'exact';
      row.learnAlias = true;
    } else {
      row.matchedId = null;
      row.matchedName = null;
      row.confidence = 0;
      row.matchType = 'none';
      row.learnAlias = false;
    }

    setParsedBoqItems(updated);
    setIsModalOpen(false);
    setActiveRowIndex(null);
  };

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

      // Bulk insert BOQ items if uploaded
      if (parsedBoqItems.length) {
        const boqPayload = parsedBoqItems.map((item) => ({
          project_id: project.id,
          material_master_id: item.matchedId,
          item_name: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          work_done: false,
          excel_row: item.index,
        }));

        const { error: boqErr } = await supabase.from('project_boq_items').insert(boqPayload);
        if (boqErr) throw boqErr;

        // Auto-learn confirmed aliases
        for (const item of parsedBoqItems) {
          if (item.matchedId && item.learnAlias) {
            await supabase.rpc('add_material_alias', {
              p_material_id: item.matchedId,
              p_new_alias: item.itemName.toLowerCase().trim(),
            });
          }
        }
      }

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
      showAlert('Project created', 'Workspace, geofence, and template tasks are ready.', [
        { text: 'Open Project', onPress: () => router.replace({ pathname: '/(admin)/project-workspace', params: { id: project.id } as any }) },
      ]);
    } catch (e: any) {
      showAlert('Could not create project', e.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const steps = ['Template', 'Details', 'Site', 'BOQ', 'Schedule'];
  const matchedRows = parsedBoqItems.filter((r) => r.confidence >= 90);
  const reviewRows = parsedBoqItems.filter((r) => r.confidence < 90);

  const filteredMaster = useMemo(() => {
    if (!masterSearch) return masterMaterials;
    return masterMaterials.filter((m) =>
      m.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(masterSearch.toLowerCase()))
    );
  }, [masterMaterials, masterSearch]);

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
        {step === 3 && <>
          <Text style={styles.heading}>Upload BOQ / Quotation (Optional)</Text>
          <Text style={styles.help}>Import project material sheets from Excel to automatically calculate and track completion progress.</Text>
          
          {parsedBoqItems.length === 0 ? (
            <TouchableOpacity onPress={triggerWebFileInput} style={styles.uploadCard}>
              {isBOQLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={36} color={colors.neutral[400]} />
                  <Text style={styles.uploadPlaceholderText}>Select BOQ Excel File</Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[400], textAlign: 'center' }}>Supports .xlsx, .xls</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fontFamily.semiBold, color: colors.ink }}>
                  Parsed Items: {parsedBoqItems.length} (Accuracy: {Math.round((matchedRows.length / parsedBoqItems.length) * 100)}%)
                </Text>
                <TouchableOpacity onPress={() => setParsedBoqItems([])} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={{ fontSize: 12, color: colors.error, fontFamily: fontFamily.medium }}>Clear</Text>
                </TouchableOpacity>
              </View>

              {/* Needs Confirmation */}
              {reviewRows.length > 0 && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ fontFamily: fontFamily.bold, color: colors.warning, fontSize: 13 }}>
                    Needs Confirmation ({reviewRows.length})
                  </Text>
                  {reviewRows.map((row) => {
                    const globalIdx = parsedBoqItems.findIndex((r) => r.index === row.index);
                    return (
                      <Card key={row.index} style={{ padding: spacing.md, gap: spacing.sm }}>
                        <Text style={{ fontFamily: fontFamily.semiBold, color: colors.ink }}>{row.itemName}</Text>
                        <Text style={{ fontSize: 12, color: colors.neutral[500] }}>Qty: {row.quantity} {row.unit}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.neutral[100], padding: 8, borderRadius: 6 }}>
                          <Text style={{ fontSize: 12, color: colors.neutral[600] }}>
                            Match: <Text style={{ fontFamily: fontFamily.semiBold }}>{row.matchedName || 'No Match'}</Text>
                          </Text>
                          <TouchableOpacity onPress={() => openReassignModal(globalIdx)} style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.neutral[300] }}>
                            <Text style={{ fontSize: 11, color: colors.neutral[600], fontFamily: fontFamily.medium }}>Reassign</Text>
                          </TouchableOpacity>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </>}
        {step === 4 && <>
          <Text style={styles.heading}>Schedule & review</Text>
          <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />
          <View style={styles.gap} />
          <DatePickerField label="Expected End Date" value={endDate} onChange={setEndDate} minDate={startDate || undefined} />
          
          <Text style={styles.fieldLabel}>Assign workers and supervisors</Text>
          <Text style={styles.help}>Only assigned people will be shown for this site and use its geofence for punch-in.</Text>
          <View style={styles.chips}>{assignablePeople.map((person: any) => { const active = assignedWorkerIds.includes(person.id); return <TouchableOpacity key={person.id} onPress={() => setAssignedWorkerIds((ids) => active ? ids.filter((id) => id !== person.id) : [...ids, person.id])} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{person.full_name} · {person.role}</Text></TouchableOpacity>; })}</View>
          
          <Card style={styles.review}>
            <Text style={styles.reviewTitle}>{name || 'Untitled project'}</Text>
            <Text style={styles.reviewLine}>{type} • {city || 'No city'}</Text>
            <Text style={styles.reviewLine}>{address || 'No address'}</Text>
            <Text style={styles.reviewLine}>Geofence: {radius} m</Text>
            <Text style={styles.reviewLine}>Template: {selectedTemplate?.name || 'None'}</Text>
            <Text style={styles.reviewLine}>BOQ Items: {parsedBoqItems.length > 0 ? `${parsedBoqItems.length} items loaded` : 'None (Optional)'}</Text>
            <Text style={styles.reviewLine}>Assigned people: {assignedWorkerIds.length}</Text>
          </Card>
        </>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} style={styles.footerButton} />}
        <GradientButton title={step === 4 ? 'Create Project' : 'Continue'} onPress={step === 4 ? save : handleNext} loading={saving} style={styles.footerButton} />
      </View>

      {/* Modal: Searchable Master Material Selection */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Master Material</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <SearchBar
                value={masterSearch}
                onChangeText={setMasterSearch}
                placeholder="Search master list..."
              />
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              <TouchableOpacity onPress={() => handleSelectMaterial(null)} style={styles.modalItemUnmatched}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.neutral[500]} />
                <Text style={styles.unmatchedItemText}>Keep as Custom / Unmatched</Text>
              </TouchableOpacity>

              {filteredMaster.map((material) => (
                <TouchableOpacity key={material.id} onPress={() => handleSelectMaterial(material)} style={styles.modalItem}>
                  <View>
                    <Text style={styles.itemMatName}>{material.name}</Text>
                    <Text style={styles.itemMatCategory}>{material.category || 'General'} · unit: {material.unit}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  modalList: {
    gap: spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  modalItemUnmatched: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  unmatchedItemText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[500],
  },
  itemMatName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  itemMatCategory: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.neutral[400],
    marginTop: 2,
  },
});
