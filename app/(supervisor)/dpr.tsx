import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Picker } from '@react-native-picker/picker';

import { Card, Button, GradientButton, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useMyDprs, useSubmitDpr } from '../../src/hooks/useDpr';
import { useProjectTasks } from '../../src/hooks/useTasks';
import { useProjectBOQ } from '../../src/hooks/useBOQ';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows, TOUCH_TARGET } from '../../src/theme/spacing';
import type { DprStatus } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

import { useMyAssignedProjects } from '../../src/hooks/useAssignedProjects';

const STATUS_META: Record<DprStatus, { color: string; bg: string; label: string }> = {
  draft: { color: colors.neutral[600], bg: colors.neutral[100], label: 'Draft' },
  submitted: { color: colors.info, bg: colors.infoBg, label: 'Submitted' },
  approved: { color: colors.success, bg: colors.successBg, label: 'Approved' },
  rejected: { color: colors.error, bg: colors.errorBg, label: 'Rejected' },
};

type ViewMode = 'list' | 'new';

export default function SupervisorDprScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: assignedProjects = [] } = useMyAssignedProjects(profile?.id);
  const { data: allProjects = [] } = useProjects();
  const availableProjects = (assignedProjects.length > 0) ? assignedProjects : allProjects;
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const activeProject = availableProjects.find(p => p.id === selectedProjectId) || availableProjects[0];

  const { data: dprs, refetch, isRefetching } = useMyDprs(profile?.id);
  const { data: boqItems = [] } = useProjectBOQ(activeProject?.id);
  const { data: projectTasks = [] } = useProjectTasks(activeProject?.id);
  const submitDpr = useSubmitDpr();

  const [mode, setMode] = useState<ViewMode>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [quantityCompleted, setQuantityCompleted] = useState<string>('');
  const [workType, setWorkType] = useState('');
  const [levelZone, setLevelZone] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [reportedQuantities, setReportedQuantities] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (!workType.trim() || !workDone.trim() || !profile?.id || !activeProject?.id) return;
    try {
      const dpr = await submitDpr.mutateAsync({
        projectId: activeProject.id,
        submittedBy: profile.id,
        workType: workType.trim(),
        levelZone: levelZone.trim(),
        workDone: workDone.trim(),
        taskId: selectedTaskId || null,
        quantityCompleted: parseFloat(quantityCompleted) || 0,
      });

      // Filter and insert BOQ items reported today
      const boqPayload = Object.entries(reportedQuantities)
        .map(([itemId, qtyStr]) => ({
          dpr_id: dpr.id,
          project_boq_item_id: itemId,
          quantity_reported: parseFloat(qtyStr),
        }))
        .filter((item) => !isNaN(item.quantity_reported) && item.quantity_reported > 0);

      if (boqPayload.length > 0) {
        const { error: boqErr } = await supabase
          .from('dpr_boq_items')
          .insert(boqPayload);
        if (boqErr) throw boqErr;
      }

      showAlert('Submitted', 'Daily Progress Report submitted successfully.');
      setSelectedTaskId(''); setQuantityCompleted('');
      setWorkType(''); setLevelZone(''); setWorkDone('');
      setReportedQuantities({});
      setMode('list');
      refetch();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to submit DPR');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
      <View style={[styles.innerContent, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Daily Progress Reports</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setMode(mode === 'new' ? 'list' : 'new')}
            hitSlop={12}
          >
            <Ionicons
              name={mode === 'new' ? 'list-outline' : 'add-circle-outline'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {mode === 'new' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={styles.formCard} padding={spacing.xl}>
              <Text style={styles.formTitle}>New DPR — {activeProject?.name || 'Project'}</Text>
              <Text style={styles.formDate}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>

              {availableProjects.length > 0 && (
                <View style={[styles.field, { marginBottom: spacing.lg }]}>
                  <Text style={styles.sectionLabel}>Select Assigned Site *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingTop: 4 }}>
                    {availableProjects.map((p) => {
                      const isSel = (activeProject?.id === p.id);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setSelectedProjectId(p.id)}
                          style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: 8,
                            borderRadius: radius.md,
                            backgroundColor: isSel ? '#695030' : '#FAF9F6',
                            borderWidth: 1,
                            borderColor: isSel ? '#695030' : colors.neutral[200],
                          }}
                        >
                          <Text style={{ color: isSel ? '#fff' : colors.ink, fontFamily: fontFamily.semiBold, fontSize: 12 }}>
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Task / Subtask Link Picker */}
              {projectTasks.length > 0 && (
                <View style={[styles.field, { marginBottom: spacing.sm }]}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 6 }}>
                    Link to Task / Subtask (Recommended)
                  </Text>
                  <View style={{ backgroundColor: '#F8FAF9', borderRadius: radius.md, overflow: 'hidden', paddingHorizontal: 4 }}>
                    <Picker
                      selectedValue={selectedTaskId}
                      onValueChange={(val: string) => {
                        setSelectedTaskId(val);
                        const sel = projectTasks.find(t => t.id === val);
                        if (sel?.level_zone && !levelZone) setLevelZone(sel.level_zone);
                        if (sel?.title && !workType) setWorkType(sel.title);
                      }}
                      style={{ height: 48 }}
                    >
                      <Picker.Item label="-- Select Task / Subtask --" value="" color={colors.neutral[500]} />
                      {projectTasks.map((t) => (
                        <Picker.Item 
                          key={t.id} 
                          label={`${t.title} (Target: ${t.planned_quantity || 0} ${t.unit || 'units'} | Done: ${t.completed_quantity || 0})`} 
                          value={t.id} 
                          color={colors.ink} 
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {selectedTaskId !== '' && (
                <View style={[styles.field, { marginBottom: spacing.sm }]}>
                  <Input
                    label="Work Quantity Completed Today (for selected task)"
                    placeholder="e.g. 50"
                    keyboardType="numeric"
                    value={quantityCompleted}
                    onChangeText={setQuantityCompleted}
                  />
                </View>
              )}

              <View style={styles.field}>
                <Input
                  label="Work Type"
                  placeholder="e.g. ACP Cladding, Glazing, Fabrication"
                  value={workType}
                  onChangeText={setWorkType}
                />
              </View>
              <View style={styles.field}>
                <Input
                  label="Level / Zone"
                  placeholder="e.g. Level 3 - North Facade"
                  value={levelZone}
                  onChangeText={setLevelZone}
                />
              </View>

              {/* Quantities Installed Today Section */}
              {boqItems.length > 0 && (
                <View style={[styles.field, { marginTop: spacing.md, gap: spacing.sm }]}>
                  <Text style={styles.sectionLabel}>Quantities Installed Today (Optional)</Text>
                  {boqItems.map((item) => (
                    <View key={item.id} style={styles.boqRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.boqItemName}>{item.item_name}</Text>
                        <Text style={styles.boqItemDetail}>
                          Installed: {item.completed_quantity} / {item.quantity} {item.unit}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={styles.boqInput}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.neutral[300]}
                          value={reportedQuantities[item.id] || ''}
                          onChangeText={(text) => {
                            setReportedQuantities((prev) => ({
                              ...prev,
                              [item.id]: text,
                            }));
                          }}
                        />
                        <Text style={styles.boqUnit}>{item.unit}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.textAreaLabel}>Work Done *</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe progress made today…"
                  placeholderTextColor={colors.neutral[400]}
                  value={workDone}
                  onChangeText={setWorkDone}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={[styles.field, { marginTop: spacing.md }]}>
                <GradientButton
                  title="Submit DPR"
                  onPress={handleSubmit}
                  loading={submitDpr.isPending}
                  disabled={!workType.trim() || !workDone.trim()}
                  fullWidth
                />
              </View>
            </Card>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          >
            {(!dprs || dprs.length === 0) && (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={48} color={colors.neutral[300]} />
                <Text style={styles.emptyText}>No DPRs submitted yet</Text>
                <Button title="Submit Today's DPR" onPress={() => setMode('new')} variant="secondary" />
              </View>
            )}
            {(dprs || []).map((dpr) => {
              const meta = STATUS_META[dpr.status];
              return (
                <Card key={dpr.id} style={styles.dprCard} padding={spacing.md}>
                  <View style={styles.dprRow}>
                    <View style={styles.dprIcon}>
                      <Ionicons name="document-text" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.dprInfo}>
                      <Text style={styles.dprDate}>
                        {new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      <Text style={styles.dprMeta}>
                        {dpr.work_type || 'General'}{dpr.level_zone ? ` · ${dpr.level_zone}` : ''}
                      </Text>
                      <Text style={styles.dprWork} numberOfLines={2}>{dpr.work_done}</Text>
                      {dpr.review_note && (
                        <Text style={styles.dprNote}>"{dpr.review_note}"</Text>
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: { 
    flex: 1, 
    ...typography.h5, 
    color: colors.ink,
    fontFamily: fontFamily.bold,
  },
  addBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  formContainer: {
    padding: spacing.lg,
    paddingBottom: 140,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  formTitle: { 
    ...typography.h6, 
    color: colors.ink, 
    fontFamily: fontFamily.bold,
    marginBottom: spacing.xs,
  },
  formDate: { 
    ...typography.caption, 
    color: colors.neutral[500], 
    marginBottom: spacing.xl,
    fontFamily: fontFamily.medium,
  },
  field: { 
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  boqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    marginBottom: spacing.xs,
  },
  boqItemName: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  boqItemDetail: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  boqInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fontFamily.medium,
    backgroundColor: '#fff',
    color: colors.ink,
  },
  boqUnit: {
    fontSize: 12,
    color: colors.neutral[500],
    width: 30,
  },
  textAreaLabel: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  textArea: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 140,
  },
  dprCard: { 
    marginBottom: spacing.md, 
    backgroundColor: '#fff', 
    borderRadius: radius.xl, 
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.sm,
  },
  dprRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: spacing.md,
  },
  dprIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(105, 80, 48, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dprInfo: { 
    flex: 1,
  },
  dprDate: { 
    ...typography.bodyMedium, 
    fontFamily: fontFamily.bold, 
    color: colors.ink,
  },
  dprMeta: { 
    ...typography.caption, 
    color: '#695030', 
    marginTop: 2, 
    fontFamily: fontFamily.medium,
  },
  dprWork: { 
    ...typography.caption, 
    color: colors.neutral[600], 
    marginTop: 6, 
    lineHeight: 18,
    fontFamily: fontFamily.regular,
  },
  dprNote: { 
    ...typography.caption, 
    color: colors.neutral[500], 
    fontStyle: 'italic', 
    marginTop: 6, 
    paddingLeft: 8, 
    borderLeftWidth: 2, 
    borderLeftColor: colors.neutral[200],
    fontFamily: fontFamily.regular,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    fontFamily: fontFamily.medium,
  },
});
